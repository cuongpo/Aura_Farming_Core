/**
 * ChatModel - Handles chat group and activity-related database operations
 */
class ChatModel {
    constructor(database) {
        this.db = database;
    }

    /**
     * Create or update a chat group
     * @param {Object} chatData - Chat data from Telegram
     * @returns {Object} Chat group record
     */
    async createOrUpdateChatGroup(chatData) {
        const { id: telegramChatId, title, type } = chatData;
        
        try {
            // Check if chat group exists
            const existingChat = await this.getChatGroupByTelegramId(telegramChatId.toString());
            
            if (existingChat) {
                // Update existing chat group
                await this.db.run(
                    `UPDATE chat_groups SET 
                        chat_title = ?, 
                        chat_type = ?, 
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE telegram_chat_id = ?`,
                    [title || null, type || null, telegramChatId.toString()]
                );
                
                return await this.getChatGroupByTelegramId(telegramChatId.toString());
            } else {
                // Create new chat group
                const result = await this.db.run(
                    `INSERT INTO chat_groups (telegram_chat_id, chat_title, chat_type) 
                     VALUES (?, ?, ?)`,
                    [telegramChatId.toString(), title || null, type || null]
                );
                
                return await this.getChatGroupById(result.id);
            }
        } catch (error) {
            console.error('Error creating/updating chat group:', error);
            throw error;
        }
    }

    /**
     * Get chat group by internal ID
     * @param {number} id - Internal chat group ID
     * @returns {Object|null} Chat group record
     */
    async getChatGroupById(id) {
        try {
            return await this.db.get('SELECT * FROM chat_groups WHERE id = ?', [id]);
        } catch (error) {
            console.error('Error getting chat group by ID:', error);
            throw error;
        }
    }

    /**
     * Get chat group by Telegram ID
     * @param {string} telegramChatId - Telegram chat ID
     * @returns {Object|null} Chat group record
     */
    async getChatGroupByTelegramId(telegramChatId) {
        try {
            return await this.db.get('SELECT * FROM chat_groups WHERE telegram_chat_id = ?', [telegramChatId]);
        } catch (error) {
            console.error('Error getting chat group by Telegram ID:', error);
            throw error;
        }
    }

    /**
     * Record user activity in a chat
     * @param {number} userId - Internal user ID
     * @param {number} chatGroupId - Internal chat group ID
     * @param {number} messageCount - Number of messages (default: 1)
     * @returns {boolean} Success status
     */
    async recordActivity(userId, chatGroupId, messageCount = 1) {
        try {
            const currentDate = this.db.constructor.getCurrentDate();
            const weekStart = this.db.constructor.getWeekStart();

            // Try to update existing record for today
            const updateResult = await this.db.run(
                `UPDATE chat_activity SET 
                    message_count = message_count + ?, 
                    updated_at = CURRENT_TIMESTAMP 
                WHERE user_id = ? AND chat_group_id = ? AND date = ?`,
                [messageCount, userId, chatGroupId, currentDate]
            );

            // If no existing record, create new one
            if (updateResult.changes === 0) {
                await this.db.run(
                    `INSERT INTO chat_activity (user_id, chat_group_id, message_count, date, week_start) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [userId, chatGroupId, messageCount, currentDate, weekStart]
                );
            }

            // Update weekly leaderboard cache
            await this.updateWeeklyLeaderboard(userId, chatGroupId, weekStart);

            return true;
        } catch (error) {
            console.error('Error recording activity:', error);
            throw error;
        }
    }

    /**
     * Update weekly leaderboard cache
     * @param {number} userId - Internal user ID
     * @param {number} chatGroupId - Internal chat group ID
     * @param {string} weekStart - Week start date
     */
    async updateWeeklyLeaderboard(userId, chatGroupId, weekStart) {
        try {
            // Calculate total messages for the week
            const weeklyTotal = await this.db.get(
                `SELECT SUM(message_count) as total 
                 FROM chat_activity 
                 WHERE user_id = ? AND chat_group_id = ? AND week_start = ?`,
                [userId, chatGroupId, weekStart]
            );

            const totalMessages = weeklyTotal?.total || 0;

            // Update or insert weekly leaderboard record
            const updateResult = await this.db.run(
                `UPDATE weekly_leaderboard SET 
                    total_messages = ?, 
                    updated_at = CURRENT_TIMESTAMP 
                WHERE user_id = ? AND chat_group_id = ? AND week_start = ?`,
                [totalMessages, userId, chatGroupId, weekStart]
            );

            if (updateResult.changes === 0) {
                await this.db.run(
                    `INSERT INTO weekly_leaderboard (user_id, chat_group_id, week_start, total_messages) 
                     VALUES (?, ?, ?, ?)`,
                    [userId, chatGroupId, weekStart, totalMessages]
                );
            }

            // Update rankings for this chat group and week
            await this.updateRankings(chatGroupId, weekStart);
        } catch (error) {
            console.error('Error updating weekly leaderboard:', error);
            throw error;
        }
    }

    /**
     * Update rankings for a specific chat group and week
     * @param {number} chatGroupId - Internal chat group ID
     * @param {string} weekStart - Week start date
     */
    async updateRankings(chatGroupId, weekStart) {
        try {
            // Get all users for this chat group and week, ordered by message count
            const users = await this.db.all(
                `SELECT id, user_id, total_messages 
                 FROM weekly_leaderboard 
                 WHERE chat_group_id = ? AND week_start = ? 
                 ORDER BY total_messages DESC, updated_at ASC`,
                [chatGroupId, weekStart]
            );

            // Update rank positions
            for (let i = 0; i < users.length; i++) {
                const rank = i + 1;
                await this.db.run(
                    'UPDATE weekly_leaderboard SET rank_position = ? WHERE id = ?',
                    [rank, users[i].id]
                );
            }
        } catch (error) {
            console.error('Error updating rankings:', error);
            throw error;
        }
    }

    /**
     * Get weekly leaderboard for a chat group
     * @param {string} telegramChatId - Telegram chat ID
     * @param {number} limit - Number of top users to return (default: 10)
     * @param {string} weekStart - Week start date (optional, defaults to current week)
     * @returns {Array} Leaderboard data
     */
    async getWeeklyLeaderboard(telegramChatId, limit = 10, weekStart = null) {
        try {
            const chatGroup = await this.getChatGroupByTelegramId(telegramChatId);
            if (!chatGroup) return [];

            const currentWeekStart = weekStart || this.db.constructor.getWeekStart();

            return await this.db.all(
                `SELECT 
                    wl.rank_position,
                    wl.total_messages,
                    u.telegram_user_id,
                    u.username,
                    u.first_name,
                    u.last_name
                FROM weekly_leaderboard wl
                JOIN users u ON wl.user_id = u.id
                WHERE wl.chat_group_id = ? AND wl.week_start = ?
                ORDER BY wl.rank_position ASC
                LIMIT ?`,
                [chatGroup.id, currentWeekStart, limit]
            );
        } catch (error) {
            console.error('Error getting weekly leaderboard:', error);
            throw error;
        }
    }

    /**
     * Get user's current ranking in a chat group
     * @param {string} telegramUserId - Telegram user ID
     * @param {string} telegramChatId - Telegram chat ID
     * @param {string} weekStart - Week start date (optional, defaults to current week)
     * @returns {Object|null} User ranking data
     */
    async getUserRanking(telegramUserId, telegramChatId, weekStart = null) {
        try {
            const currentWeekStart = weekStart || this.db.constructor.getWeekStart();

            return await this.db.get(
                `SELECT 
                    wl.rank_position,
                    wl.total_messages,
                    u.username,
                    u.first_name,
                    u.last_name,
                    (SELECT COUNT(*) FROM weekly_leaderboard wl2 
                     JOIN chat_groups cg2 ON wl2.chat_group_id = cg2.id 
                     WHERE cg2.telegram_chat_id = ? AND wl2.week_start = ?) as total_participants
                FROM weekly_leaderboard wl
                JOIN users u ON wl.user_id = u.id
                JOIN chat_groups cg ON wl.chat_group_id = cg.id
                WHERE u.telegram_user_id = ? AND cg.telegram_chat_id = ? AND wl.week_start = ?`,
                [telegramChatId, currentWeekStart, telegramUserId, telegramChatId, currentWeekStart]
            );
        } catch (error) {
            console.error('Error getting user ranking:', error);
            throw error;
        }
    }

    /**
     * Get chat group statistics
     * @param {string} telegramChatId - Telegram chat ID
     * @returns {Object} Chat statistics
     */
    async getChatStats(telegramChatId) {
        try {
            const chatGroup = await this.getChatGroupByTelegramId(telegramChatId);
            if (!chatGroup) return null;

            const stats = await this.db.get(
                `SELECT 
                    COUNT(DISTINCT ca.user_id) as total_users,
                    SUM(ca.message_count) as total_messages,
                    COUNT(DISTINCT ca.date) as active_days,
                    AVG(ca.message_count) as avg_messages_per_day
                FROM chat_activity ca
                WHERE ca.chat_group_id = ?`,
                [chatGroup.id]
            );

            return {
                chat_group: chatGroup,
                stats: stats || {
                    total_users: 0,
                    total_messages: 0,
                    active_days: 0,
                    avg_messages_per_day: 0
                }
            };
        } catch (error) {
            console.error('Error getting chat stats:', error);
            throw error;
        }
    }
}

export default ChatModel;
