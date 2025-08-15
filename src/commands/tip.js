/**
 * Tip command implementation
 */

/**
 * Format user display name
 * @param {Object} user - User data
 * @returns {string} Formatted display name
 */
function formatUserName(user) {
    if (user.username) {
        return `@${user.username}`;
    } else if (user.first_name && user.last_name) {
        return `${user.first_name} ${user.last_name}`;
    } else if (user.first_name) {
        return user.first_name;
    } else {
        return `User ${user.telegram_user_id}`;
    }
}

/**
 * Parse tip command arguments
 * @param {string} text - Command text
 * @returns {Object} Parsed arguments
 */
function parseTipArguments(text) {
    const args = text.split(' ').slice(1);
    
    if (args.length < 2) {
        return { error: 'Usage: /tip @username amount\nExample: /tip @alice 10' };
    }

    const target = args[0];
    const amount = args[1];
    const message = args.slice(2).join(' ') || '';

    // Validate target format
    if (!target.startsWith('@') && !/^\d+$/.test(target)) {
        return { error: 'Please specify a user with @username or user ID' };
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
        return { error: 'Please provide a valid positive amount' };
    }

    if (amountNum > 1000) {
        return { error: 'Maximum tip amount is 1000 mUSDT' };
    }

    return {
        target,
        amount: amountNum,
        message: message.trim()
    };
}

/**
 * Create transaction record in database
 * @param {Object} database - Database instance
 * @param {Object} transactionData - Transaction data
 * @returns {number} Transaction ID
 */
async function createTransactionRecord(database, transactionData) {
    const result = await database.run(
        `INSERT INTO transactions 
         (from_user_id, to_user_id, from_address, to_address, amount, token_address, 
          tx_type, status, chat_group_id, admin_user_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            transactionData.fromUserId,
            transactionData.toUserId,
            transactionData.fromAddress,
            transactionData.toAddress,
            transactionData.amount.toString(),
            transactionData.tokenAddress,
            'tip',
            'pending',
            transactionData.chatGroupId,
            transactionData.adminUserId
        ]
    );
    
    return result.id;
}

/**
 * Update transaction status
 * @param {Object} database - Database instance
 * @param {number} transactionId - Transaction ID
 * @param {string} status - New status
 * @param {string} txHash - Transaction hash (optional)
 */
async function updateTransactionStatus(database, transactionId, status, txHash = null) {
    await database.run(
        'UPDATE transactions SET status = ?, tx_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, txHash, transactionId]
    );
}

/**
 * Handle tip command
 * @param {Object} walletService - WalletService instance (fallback)
 * @param {Object} accountAbstractionService - AccountAbstractionService instance
 * @param {Object} userModel - UserModel instance
 * @param {Object} database - Database instance
 * @param {Array} adminUserIds - Array of admin user IDs
 */
export function createTipCommand(walletService, accountAbstractionService, userModel, database, adminUserIds) {
    return async (ctx) => {
        try {
            const adminId = ctx.from.id.toString();
            
            // Check if requester is admin
            if (!adminUserIds.includes(adminId)) {
                return await ctx.reply('❌ This command is only available to administrators.');
            }

            // Parse command arguments
            const parsed = parseTipArguments(ctx.message.text);
            if (parsed.error) {
                return await ctx.reply(`❌ ${parsed.error}`);
            }

            const { target, amount, message } = parsed;

            // Find target user
            let targetUser = null;
            if (target.startsWith('@')) {
                const username = target.substring(1);
                targetUser = await userModel.getUserByUsername(username);
            } else if (/^\d+$/.test(target)) {
                targetUser = await userModel.getUserByTelegramId(target);
            }

            if (!targetUser) {
                return await ctx.reply(`❌ User ${target} not found. They need to interact with the bot first by sending any message in this group or starting a private chat with the bot.`);
            }

            // Check if trying to tip themselves
            if (targetUser.telegram_user_id === adminId) {
                return await ctx.reply('❌ You cannot tip yourself!');
            }

            // Use Account Abstraction service if available, otherwise fallback
            const service = accountAbstractionService || walletService;

            // Get admin and target wallets
            const adminWallet = await service.getUserWallet(adminId);
            const targetWallet = await service.getUserWallet(targetUser.telegram_user_id);

            // Update wallet addresses in database
            await userModel.updateUserWallet(adminId, adminWallet.address);
            await userModel.updateUserWallet(targetUser.telegram_user_id, targetWallet.address);

            // Check if USDT contract is configured
            if (!process.env.USDT_CONTRACT_ADDRESS) {
                return await ctx.reply('❌ USDT contract not configured. Please deploy the contract first.');
            }

            // Get chat group ID if in group chat
            let chatGroupId = null;
            if (ctx.chatGroup) {
                chatGroupId = ctx.chatGroup.id;
            }

            // Get admin user record
            const adminUser = await userModel.getUserByTelegramId(adminId);

            // Create transaction record
            const transactionId = await createTransactionRecord(database, {
                fromUserId: adminUser.id,
                toUserId: targetUser.id,
                fromAddress: adminWallet.address,
                toAddress: targetWallet.address,
                amount: amount,
                tokenAddress: process.env.MOCK_USDT_CONTRACT_ADDRESS,
                chatGroupId: chatGroupId,
                adminUserId: adminUser.id
            });

            // Send initial confirmation
            const initialMessage = `
💰 <b>Processing Tip</b>

👤 <b>From:</b> ${formatUserName(ctx.from)}
🎯 <b>To:</b> ${formatUserName(targetUser)}
💵 <b>Amount:</b> ${amount} mUSDT
${message ? `💬 <b>Message:</b> ${message}` : ''}

⏳ <b>Status:</b> Processing transaction...
            `;

            const statusMessage = await ctx.replyWithHTML(initialMessage);

            try {
                // Check admin's token balance (use signer address for actual balance)
                const balanceAddress = adminWallet.signerAddress || adminWallet.address;
                const adminBalance = await service.getWalletBalance(
                    balanceAddress,
                    process.env.MOCK_USDT_CONTRACT_ADDRESS
                );

                if (parseFloat(adminBalance) < amount) {
                    await updateTransactionStatus(database, transactionId, 'failed');
                    
                    return await ctx.telegram.editMessageText(
                        ctx.chat.id,
                        statusMessage.message_id,
                        null,
                        `❌ <b>Tip Failed</b>\n\nInsufficient mUSDT balance. Admin has ${adminBalance} mUSDT but tried to send ${amount} mUSDT.`,
                        { parse_mode: 'HTML' }
                    );
                }

                // Execute the transfer
                const transferResult = await service.transferTokens(
                    adminId,
                    targetUser.telegram_user_id,
                    amount.toString(),
                    process.env.USDT_CONTRACT_ADDRESS
                );

                if (transferResult.success) {
                    // Update transaction status
                    await updateTransactionStatus(database, transactionId, 'confirmed', transferResult.txHash);

                    // Send success message
                    const successMessage = `
✅ <b>Tip Sent Successfully!</b>

👤 <b>From:</b> ${formatUserName(ctx.from)}
🎯 <b>To:</b> ${formatUserName(targetUser)}
💵 <b>Amount:</b> ${amount} mUSDT
${message ? `💬 <b>Message:</b> ${message}` : ''}

🔗 <b>Transaction:</b> <code>${transferResult.txHash}</code>
⛽ <b>Gas Used:</b> ${transferResult.gasUsed}

🎉 <b>Congratulations ${formatUserName(targetUser)}!</b>
                    `;

                    await ctx.telegram.editMessageText(
                        ctx.chat.id,
                        statusMessage.message_id,
                        null,
                        successMessage,
                        { parse_mode: 'HTML' }
                    );

                    // Send notification to target user if in group chat
                    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
                        try {
                            await ctx.telegram.sendMessage(
                                targetUser.telegram_user_id,
                                `🎉 You received a tip of ${amount} mUSDT from ${formatUserName(ctx.from)} in ${ctx.chat.title}!\n\nTransaction: ${transferResult.txHash}`
                            );
                        } catch (dmError) {
                            console.log('Could not send DM to user:', dmError.message);
                        }
                    }

                } else {
                    // Update transaction status
                    await updateTransactionStatus(database, transactionId, 'failed');

                    const errorMessage = `
❌ <b>Tip Failed</b>

Error: ${transferResult.error}

Please try again or contact support if the problem persists.
                    `;

                    await ctx.telegram.editMessageText(
                        ctx.chat.id,
                        statusMessage.message_id,
                        null,
                        errorMessage,
                        { parse_mode: 'HTML' }
                    );
                }

            } catch (error) {
                console.error('Error processing tip:', error);
                
                await updateTransactionStatus(database, transactionId, 'failed');
                
                await ctx.telegram.editMessageText(
                    ctx.chat.id,
                    statusMessage.message_id,
                    null,
                    `❌ <b>Tip Failed</b>\n\nAn unexpected error occurred: ${error.message}`,
                    { parse_mode: 'HTML' }
                );
            }

        } catch (error) {
            console.error('Error in tip command:', error);
            await ctx.reply('❌ Sorry, I couldn\'t process the tip right now. Please try again later.');
        }
    };
}

/**
 * Handle tip history command
 * @param {Object} database - Database instance
 * @param {Array} adminUserIds - Array of admin user IDs
 */
export function createTipHistoryCommand(database, adminUserIds) {
    return async (ctx) => {
        try {
            const userId = ctx.from.id.toString();
            
            // Check if requester is admin for full history, otherwise show user's history
            const isAdmin = adminUserIds.includes(userId);
            
            let query, params;
            
            if (isAdmin) {
                // Admin can see all tips
                query = `
                    SELECT t.*, 
                           u_from.username as from_username, u_from.first_name as from_first_name,
                           u_to.username as to_username, u_to.first_name as to_first_name
                    FROM transactions t
                    LEFT JOIN users u_from ON t.from_user_id = u_from.id
                    JOIN users u_to ON t.to_user_id = u_to.id
                    WHERE t.tx_type = 'tip'
                    ORDER BY t.created_at DESC
                    LIMIT 20
                `;
                params = [];
            } else {
                // Regular user can only see tips they received
                const user = await userModel.getUserByTelegramId(userId);
                if (!user) {
                    return await ctx.reply('❌ User not found in database.');
                }
                
                query = `
                    SELECT t.*, 
                           u_from.username as from_username, u_from.first_name as from_first_name
                    FROM transactions t
                    LEFT JOIN users u_from ON t.from_user_id = u_from.id
                    WHERE t.to_user_id = ? AND t.tx_type = 'tip'
                    ORDER BY t.created_at DESC
                    LIMIT 10
                `;
                params = [user.id];
            }
            
            const tips = await database.all(query, params);
            
            if (tips.length === 0) {
                return await ctx.reply(isAdmin ? 
                    '📊 No tips have been sent yet.' : 
                    '📊 You haven\'t received any tips yet.'
                );
            }
            
            let message = isAdmin ? 
                '📊 <b>Recent Tips (Admin View)</b>\n\n' : 
                '📊 <b>Your Received Tips</b>\n\n';
            
            for (const tip of tips) {
                const fromName = tip.from_username ? `@${tip.from_username}` : 
                                (tip.from_first_name || 'Admin');
                const toName = tip.to_username ? `@${tip.to_username}` : 
                              (tip.to_first_name || 'User');
                const date = new Date(tip.created_at).toLocaleDateString();
                const status = tip.status === 'confirmed' ? '✅' : 
                              tip.status === 'failed' ? '❌' : '⏳';
                
                if (isAdmin) {
                    message += `${status} ${fromName} → ${toName}: ${tip.amount} mUSDT (${date})\n`;
                } else {
                    message += `${status} From ${fromName}: ${tip.amount} mUSDT (${date})\n`;
                }
            }
            
            await ctx.replyWithHTML(message);
            
        } catch (error) {
            console.error('Error in tip history command:', error);
            await ctx.reply('❌ Sorry, I couldn\'t retrieve the tip history right now. Please try again later.');
        }
    };
}
