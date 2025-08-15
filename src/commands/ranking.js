/**
 * Ranking command implementation
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
        return 'You';
    }
}

/**
 * Get rank emoji based on position
 * @param {number} rank - Rank position
 * @param {number} totalParticipants - Total number of participants
 * @returns {string} Rank emoji
 */
function getRankEmoji(rank, totalParticipants) {
    if (!rank || !totalParticipants) return '📊';
    
    const percentage = (rank / totalParticipants) * 100;
    
    if (rank === 1) return '👑';
    if (rank <= 3) return '🏆';
    if (percentage <= 10) return '⭐';
    if (percentage <= 25) return '🔥';
    if (percentage <= 50) return '💪';
    if (percentage <= 75) return '📈';
    return '🌱';
}

/**
 * Get motivational message based on rank
 * @param {number} rank - Rank position
 * @param {number} totalParticipants - Total number of participants
 * @returns {string} Motivational message
 */
function getMotivationalMessage(rank, totalParticipants) {
    if (!rank || !totalParticipants) {
        return "Start chatting to appear on the leaderboard! 🚀";
    }
    
    const percentage = (rank / totalParticipants) * 100;
    
    if (rank === 1) {
        return "Amazing! You're the most active user this week! 👑";
    } else if (rank <= 3) {
        return "Excellent! You're in the top 3 most active users! 🏆";
    } else if (percentage <= 10) {
        return "Great job! You're in the top 10% of active users! ⭐";
    } else if (percentage <= 25) {
        return "Well done! You're in the top 25% of active users! 🔥";
    } else if (percentage <= 50) {
        return "Good work! You're in the top half of active users! 💪";
    } else if (percentage <= 75) {
        return "Keep it up! You're making good progress! 📈";
    } else {
        return "Every message counts! Keep chatting to climb higher! 🌱";
    }
}

/**
 * Format ranking message for group chat
 * @param {Object} ranking - User ranking data
 * @param {string} chatTitle - Chat title
 * @param {string} weekStart - Week start date
 * @returns {string} Formatted ranking message
 */
function formatGroupRankingMessage(ranking, chatTitle, weekStart) {
    if (!ranking) {
        return `
📈 <b>Your Ranking</b>
📅 Week starting: ${weekStart}
💬 Chat: ${chatTitle || 'This Chat'}

You haven't sent any messages this week yet. Start chatting to appear on the leaderboard! 🚀

💡 <i>Tip: Be active in conversations to climb the rankings!</i>
        `;
    }

    const userName = formatUserName(ranking);
    const rank = ranking.rank_position;
    const totalMessages = ranking.total_messages;
    const totalParticipants = ranking.total_participants;
    const rankEmoji = getRankEmoji(rank, totalParticipants);
    const motivationalMsg = getMotivationalMessage(rank, totalParticipants);

    return `
📈 <b>Your Ranking</b>
📅 Week starting: ${weekStart}
💬 Chat: ${chatTitle || 'This Chat'}

${rankEmoji} <b>Rank #${rank}</b> out of ${totalParticipants} users
💬 <b>${totalMessages}</b> messages this week
👤 ${userName}

${motivationalMsg}

💡 <i>Keep chatting to improve your ranking!</i>
🎁 <i>Active users may receive rewards from admins!</i>
    `;
}

/**
 * Format ranking message for private chat (overall stats)
 * @param {Object} userStats - User statistics
 * @param {string} weekStart - Week start date
 * @returns {string} Formatted ranking message
 */
function formatPrivateRankingMessage(userStats, weekStart) {
    if (!userStats || !userStats.stats) {
        return `
📈 <b>Your Overall Statistics</b>
📅 Week starting: ${weekStart}

You haven't been active in any groups yet. Join a group chat where I'm present to start earning activity points! 🚀

💡 <i>Add me to group chats to track your activity!</i>
        `;
    }

    const stats = userStats.stats;
    const user = userStats.user;
    const userName = formatUserName(user);

    return `
📈 <b>Your Overall Statistics</b>
📅 Current week: ${weekStart}
👤 ${userName}

📊 <b>All-Time Stats:</b>
💬 Total messages: ${stats.total_messages || 0}
📅 Active days: ${stats.active_days || 0}
📈 Avg messages/day: ${Math.round(stats.avg_messages_per_day || 0)}
🔥 Best day: ${stats.max_messages_in_day || 0} messages

⏰ <b>Activity Period:</b>
🎯 First activity: ${stats.first_activity ? new Date(stats.first_activity).toLocaleDateString() : 'N/A'}
🕐 Last activity: ${stats.last_activity ? new Date(stats.last_activity).toLocaleDateString() : 'N/A'}

💡 <i>Use /ranking in group chats to see your weekly rank!</i>
🎁 <i>Stay active to earn rewards from admins!</i>
    `;
}

/**
 * Handle ranking command
 * @param {Object} activityTracker - ActivityTracker instance
 * @param {Object} userModel - UserModel instance
 * @param {Object} database - Database instance
 */
export function createRankingCommand(activityTracker, userModel, database) {
    return async (ctx) => {
        try {
            const userId = ctx.from.id.toString();
            const chatId = ctx.chat.id.toString();
            const chatType = ctx.chat.type;
            const chatTitle = ctx.chat.title;
            const weekStart = database.constructor.getWeekStart();

            if (chatType === 'group' || chatType === 'supergroup') {
                // Group chat - show ranking for this specific chat
                const ranking = await activityTracker.getUserActivityStats(userId, chatId);
                const message = formatGroupRankingMessage(ranking, chatTitle, weekStart);
                await ctx.replyWithHTML(message);
                
            } else {
                // Private chat - show overall statistics
                const userStats = await userModel.getUserStats(userId);
                const message = formatPrivateRankingMessage(userStats, weekStart);
                await ctx.replyWithHTML(message);
            }
            
        } catch (error) {
            console.error('Error in ranking command:', error);
            await ctx.reply('❌ Sorry, I couldn\'t retrieve your ranking right now. Please try again later.');
        }
    };
}

/**
 * Handle ranking command with target user (admin feature)
 * @param {Object} activityTracker - ActivityTracker instance
 * @param {Object} userModel - UserModel instance
 * @param {Object} database - Database instance
 * @param {Array} adminUserIds - Array of admin user IDs
 */
export function createAdminRankingCommand(activityTracker, userModel, database, adminUserIds) {
    return async (ctx) => {
        try {
            const requesterId = ctx.from.id.toString();
            
            // Check if requester is admin
            if (!adminUserIds.includes(requesterId)) {
                return await ctx.reply('❌ This command is only available to administrators.');
            }

            const args = ctx.message.text.split(' ').slice(1);
            if (args.length === 0) {
                return await ctx.reply('Usage: /adminrank @username or /adminrank user_id');
            }

            let targetUser = null;
            const target = args[0];

            if (target.startsWith('@')) {
                // Username provided
                const username = target.substring(1);
                targetUser = await userModel.getUserByUsername(username);
            } else if (/^\d+$/.test(target)) {
                // User ID provided
                targetUser = await userModel.getUserByTelegramId(target);
            }

            if (!targetUser) {
                return await ctx.reply('❌ User not found. Make sure they have interacted with the bot.');
            }

            const chatId = ctx.chat.id.toString();
            const chatType = ctx.chat.type;
            const chatTitle = ctx.chat.title;
            const weekStart = database.constructor.getWeekStart();

            if (chatType === 'group' || chatType === 'supergroup') {
                // Group chat - show ranking for this specific chat
                const ranking = await activityTracker.getUserActivityStats(targetUser.telegram_user_id, chatId);
                const message = formatGroupRankingMessage(ranking, chatTitle, weekStart);
                await ctx.replyWithHTML(`<b>Ranking for ${formatUserName(targetUser)}:</b>\n\n${message}`);
                
            } else {
                // Private chat - show overall statistics
                const userStats = await userModel.getUserStats(targetUser.telegram_user_id);
                const message = formatPrivateRankingMessage(userStats, weekStart);
                await ctx.replyWithHTML(`<b>Statistics for ${formatUserName(targetUser)}:</b>\n\n${message}`);
            }
            
        } catch (error) {
            console.error('Error in admin ranking command:', error);
            await ctx.reply('❌ Sorry, I couldn\'t retrieve the user ranking right now. Please try again later.');
        }
    };
}
