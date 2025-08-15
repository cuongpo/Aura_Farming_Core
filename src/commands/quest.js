/**
 * Quest system commands for daily chests and AURA rewards
 */

export function createQuestCommand(questModel) {
    return async (ctx) => {
        try {
            const userId = ctx.from.id.toString();
            const questStatus = await questModel.getUserQuestStatus(userId);
            
            if (!questStatus) {
                return await ctx.reply('❌ Error loading quest status. Please try again.');
            }

            const today = new Date().toLocaleDateString();
            let message = `🎮 **Daily Quest - ${today}**\n\n`;

            // Quest status
            if (questStatus.quest.completed) {
                message += '✅ **Daily Quest Completed!**\n';
                message += `📝 Messages sent today: ${questStatus.messageCount}\n\n`;
            } else {
                message += '📋 **Daily Quest: Send at least 1 message in group chat**\n';
                message += `📝 Messages sent today: ${questStatus.messageCount}\n`;
                message += '💡 *Send a message in any group chat to complete the quest*\n\n';
            }

            // Chest status
            if (questStatus.chest.eligible && !questStatus.chest.opened) {
                message += '🎁 **Daily Chest Available!**\n';
                message += '💰 Reward: 0-5 mUSDT tokens (random)\n';
                message += '🔓 Use /openchest to open your daily chest\n\n';
            } else if (questStatus.chest.opened) {
                message += '📦 **Daily Chest Opened**\n';
                message += `🪙 Reward earned: ${questStatus.chest.reward_amount} mUSDT\n\n`;
            } else if (questStatus.quest.completed) {
                message += '⏳ **Daily Chest Processing...**\n';
                message += '🔄 Complete your quest to unlock the chest\n\n';
            } else {
                message += '🔒 **Daily Chest Locked**\n';
                message += '📝 Complete daily quest to unlock\n\n';
            }

            // Instructions
            message += '📖 **How it works:**\n';
            message += '• Send at least 1 message in any group chat daily\n';
            message += '• Complete quest to unlock daily chest\n';
            message += '• Open chest to get 0-5 AURA tokens\n';
            message += '• Claim rewards (you pay gas fees)\n\n';
            
            message += '🎯 **Commands:**\n';
            message += '• /quest - View quest status\n';
            message += '• /openchest - Open daily chest\n';
            message += '• /questhistory - View quest history';

            await ctx.reply(message, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('Error in quest command:', error);
            await ctx.reply('❌ Error loading quest information. Please try again later.');
        }
    };
}

export function createOpenChestCommand(questModel, auraService) {
    return async (ctx) => {
        try {
            const userId = ctx.from.id.toString();
            const questStatus = await questModel.getUserQuestStatus(userId);
            
            if (!questStatus) {
                return await ctx.reply('❌ Error loading quest status. Please try again.');
            }

            // Check if chest is available
            if (!questStatus.chest.eligible) {
                return await ctx.reply('🔒 Daily chest is locked! Complete your daily quest first by sending a message in any group chat.');
            }

            if (questStatus.chest.opened) {
                return await ctx.reply(`📦 You already opened today's chest and received ${questStatus.chest.reward_amount} AURA tokens!`);
            }

            // Open the chest
            const result = await questModel.openDailyChest(userId);
            
            if (!result.success) {
                return await ctx.reply(`❌ ${result.error}`);
            }

            // Show chest opening animation
            const openingMsg = await ctx.reply('🎁 Opening your daily chest...');
            
            // Simulate chest opening delay
            setTimeout(async () => {
                try {
                    await ctx.telegram.editMessageText(
                        ctx.chat.id,
                        openingMsg.message_id,
                        null,
                        '✨ Chest opened! ✨'
                    );

                    // Show reward
                    let rewardMessage = `🎉 **Daily Chest Opened!**\n\n`;
                    
                    if (result.reward > 0) {
                        rewardMessage += `🪙 **You won ${result.reward} AURA tokens!**\n\n`;
                        rewardMessage += '💰 Use /claimaura to claim your AURA tokens\n';
                        rewardMessage += '⚠️ *Note: You will pay the gas fees for claiming*\n\n';
                    } else {
                        rewardMessage += '😅 **Better luck tomorrow!**\n';
                        rewardMessage += '🪙 You received 0 AURA tokens this time\n\n';
                    }
                    
                    rewardMessage += '🔄 Come back tomorrow for another chest!\n';
                    rewardMessage += '📊 Use /questhistory to see your quest progress';

                    await ctx.reply(rewardMessage, { parse_mode: 'Markdown' });

                } catch (editError) {
                    console.error('Error editing chest opening message:', editError);
                }
            }, 2000);

        } catch (error) {
            console.error('Error in open chest command:', error);
            await ctx.reply('❌ Error opening chest. Please try again later.');
        }
    };
}

export function createClaimAuraCommand(questModel, auraService, userModel) {
    return async (ctx) => {
        try {
            const userId = ctx.from.id.toString();
            const today = new Date().toISOString().split('T')[0];
            
            // Get today's chest
            const chest = await questModel.db.get(`
                SELECT * FROM daily_chests 
                WHERE user_id = ? AND chest_date = ? AND opened = TRUE AND reward_amount > 0 AND transaction_hash IS NULL
            `, [userId, today]);

            if (!chest) {
                return await ctx.reply('❌ No AURA tokens to claim today, or already claimed.');
            }

            // Get user wallet
            const user = await userModel.getUser(userId);
            if (!user) {
                return await ctx.reply('❌ User not found. Please start the bot first with /start.');
            }

            const processingMsg = await ctx.reply('⏳ Processing AURA claim...');

            try {
                // Mint AURA tokens to user's wallet
                const txHash = await auraService.mintChestReward(
                    user.wallet_address,
                    chest.reward_amount,
                    parseInt(today.replace(/-/g, '')) // Convert date to number for day parameter
                );

                // Update chest with transaction hash
                await questModel.updateChestTransaction(userId, today, txHash);

                await ctx.telegram.editMessageText(
                    ctx.chat.id,
                    processingMsg.message_id,
                    null,
                    `✅ **AURA Claimed Successfully!**\n\n🪙 Amount: ${chest.reward_amount} AURA\n🔗 Transaction: \`${txHash}\`\n\n💰 AURA tokens have been sent to your wallet!`,
                    { parse_mode: 'Markdown' }
                );

            } catch (txError) {
                console.error('Error claiming AURA:', txError);
                await ctx.telegram.editMessageText(
                    ctx.chat.id,
                    processingMsg.message_id,
                    null,
                    '❌ Failed to claim AURA tokens. Please try again later or contact support.'
                );
            }

        } catch (error) {
            console.error('Error in claim AURA command:', error);
            await ctx.reply('❌ Error processing claim. Please try again later.');
        }
    };
}

export function createQuestHistoryCommand(questModel) {
    return async (ctx) => {
        try {
            const userId = ctx.from.id.toString();
            const history = await questModel.getUserQuestHistory(userId, 7);
            const stats = await questModel.getQuestStats(userId);

            if (!history || history.length === 0) {
                return await ctx.reply('📊 No quest history found. Start completing daily quests to see your progress here!');
            }

            let message = `📊 **Quest History (Last 7 Days)**\n\n`;
            
            // Overall stats
            message += `🏆 **Overall Stats:**\n`;
            message += `✅ Completed: ${stats.completed_quests}/${stats.total_quests} quests\n`;
            message += `🪙 Total AURA earned: ${stats.total_aura_earned}\n\n`;

            // Daily history
            message += `📅 **Daily Progress:**\n`;
            
            history.forEach(day => {
                const date = new Date(day.quest_date).toLocaleDateString();
                const questIcon = day.completed ? '✅' : '❌';
                const chestIcon = day.opened ? '📦' : (day.completed ? '🎁' : '🔒');
                const reward = day.reward_amount || 0;
                
                message += `${date}: ${questIcon} Quest ${chestIcon} Chest`;
                if (day.opened && reward > 0) {
                    message += ` (+${reward} AURA)`;
                }
                message += '\n';
            });

            message += '\n💡 *Keep completing daily quests to earn more AURA!*';

            await ctx.reply(message, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('Error in quest history command:', error);
            await ctx.reply('❌ Error loading quest history. Please try again later.');
        }
    };
}
