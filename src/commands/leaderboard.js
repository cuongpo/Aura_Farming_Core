/**
 * Leaderboard command implementation
 */

/**
 * Format user display name
 * @param {Object} user - User data from database
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
 * Get medal emoji for ranking position
 * @param {number} position - Ranking position (1-based)
 * @returns {string} Medal emoji
 */
function getMedalEmoji(position) {
    switch (position) {
        case 1: return '🥇';
        case 2: return '🥈';
        case 3: return '🥉';
        default: return '🏅';
    }
}

/**
 * Format the leaderboard message
 * @param {Array} leaderboard - Leaderboard data
 * @param {string} chatTitle - Chat title
 * @param {string} weekStart - Week start date
 * @returns {string} Formatted leaderboard message
 */
function formatLeaderboardMessage(leaderboard, chatTitle, weekStart) {
    if (leaderboard.length === 0) {
        return `
📊 <b>Weekly Leaderboard</b>
📅 Week starting: ${weekStart}
💬 Chat: ${chatTitle || 'This Chat'}

No activity recorded yet this week. Start chatting to appear on the leaderboard! 🚀
        `;
    }

    let message = `
📊 <b>Weekly Leaderboard</b>
📅 Week starting: ${weekStart}
💬 Chat: ${chatTitle || 'This Chat'}

`;

    leaderboard.forEach((user, index) => {
        const position = user.rank_position || (index + 1);
        const medal = getMedalEmoji(position);
        const userName = formatUserName(user);
        const messageCount = user.total_messages || 0;
        
        message += `${medal} <b>#${position}</b> ${userName} - ${messageCount} messages\n`;
    });

    message += `
💡 <i>Keep chatting to climb the leaderboard!</i>
🎁 <i>Admins can reward active users with /tip</i>
    `;

    return message;
}

/**
 * Handle leaderboard command
 * @param {Object} activityTracker - ActivityTracker instance
 * @param {Object} database - Database instance
 */
export function createLeaderboardCommand(activityTracker, database) {
    return async (ctx) => {
        try {
            const chatId = ctx.chat.id.toString();
            const chatTitle = ctx.chat.title;
            
            // Get current week start date
            const weekStart = database.constructor.getWeekStart();
            
            // Get leaderboard data
            const leaderboard = await activityTracker.getLeaderboard(chatId, 10);
            
            // Format and send the message
            const message = formatLeaderboardMessage(leaderboard, chatTitle, weekStart);
            
            await ctx.replyWithHTML(message);
            
        } catch (error) {
            console.error('Error in leaderboard command:', error);
            await ctx.reply('❌ Sorry, I couldn\'t retrieve the leaderboard right now. Please try again later.');
        }
    };
}

/**
 * Handle leaderboard command with additional options
 * @param {Object} activityTracker - ActivityTracker instance
 * @param {Object} database - Database instance
 */
export function createExtendedLeaderboardCommand(activityTracker, database) {
    return async (ctx) => {
        try {
            const chatId = ctx.chat.id.toString();
            const chatTitle = ctx.chat.title;
            
            // Parse command arguments
            const args = ctx.message.text.split(' ').slice(1);
            let limit = 10;
            let weekOffset = 0; // 0 = current week, 1 = last week, etc.
            
            // Parse arguments
            for (let i = 0; i < args.length; i++) {
                const arg = args[i].toLowerCase();
                
                if (arg === 'top' && args[i + 1]) {
                    const parsedLimit = parseInt(args[i + 1]);
                    if (parsedLimit > 0 && parsedLimit <= 50) {
                        limit = parsedLimit;
                    }
                    i++; // Skip next argument as it's the number
                } else if (arg === 'last' || arg === 'previous') {
                    weekOffset = 1;
                }
            }
            
            // Calculate week start date
            const currentDate = new Date();
            currentDate.setDate(currentDate.getDate() - (weekOffset * 7));
            const weekStart = database.constructor.getWeekStart(currentDate);
            
            // Get leaderboard data
            const leaderboard = await activityTracker.getLeaderboard(chatId, limit);
            
            // Get chat activity summary
            const chatStats = await activityTracker.getChatActivitySummary(chatId);
            
            // Format message with additional info
            let message = formatLeaderboardMessage(leaderboard, chatTitle, weekStart);
            
            if (chatStats && chatStats.stats) {
                message += `
📈 <b>Chat Statistics</b>
👥 Total active users: ${chatStats.stats.total_users || 0}
💬 Total messages: ${chatStats.stats.total_messages || 0}
📅 Active days: ${chatStats.stats.active_days || 0}
                `;
            }
            
            await ctx.replyWithHTML(message);
            
        } catch (error) {
            console.error('Error in extended leaderboard command:', error);
            await ctx.reply('❌ Sorry, I couldn\'t retrieve the leaderboard right now. Please try again later.');
        }
    };
}
