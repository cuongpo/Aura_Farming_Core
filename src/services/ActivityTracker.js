/**
 * ActivityTracker - Service for tracking user chat activity
 */
class ActivityTracker {
    constructor(chatModel) {
        this.chatModel = chatModel;
        this.messageBuffer = new Map(); // Buffer messages to batch database writes
        this.flushInterval = 30000; // Flush every 30 seconds
        this.maxBufferSize = 100; // Flush when buffer reaches this size
        
        // Start periodic flush
        this.startPeriodicFlush();
    }

    /**
     * Track a message from a user in a chat
     * @param {Object} ctx - Telegraf context
     */
    async trackMessage(ctx) {
        try {
            console.log(`🔍 Tracking message: "${ctx.message?.text}" from ${ctx.from.first_name} in ${ctx.chat.type} chat`);

            // Only track in group chats
            if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
                console.log(`⏭️  Skipping: not a group chat (${ctx.chat.type})`);
                return;
            }

            // Skip bot messages and commands
            if (ctx.from.is_bot || (ctx.message?.text && ctx.message.text.startsWith('/'))) {
                console.log(`⏭️  Skipping: bot message or command`);
                return;
            }

            const userId = ctx.user.id;
            const chatGroupId = ctx.chatGroup.id;
            const key = `${userId}-${chatGroupId}`;

            console.log(`📊 Adding to buffer: User ${userId}, Chat ${chatGroupId}, Key: ${key}`);

            // Add to buffer
            if (this.messageBuffer.has(key)) {
                this.messageBuffer.get(key).count++;
                console.log(`📈 Updated count to ${this.messageBuffer.get(key).count} for ${key}`);
            } else {
                this.messageBuffer.set(key, {
                    userId: userId,
                    chatGroupId: chatGroupId,
                    count: 1,
                    timestamp: Date.now()
                });
                console.log(`🆕 New entry created for ${key}`);
            }

            // Flush if buffer is getting large
            if (this.messageBuffer.size >= this.maxBufferSize) {
                await this.flushBuffer();
            }

        } catch (error) {
            console.error('Error tracking message:', error);
        }
    }

    /**
     * Flush the message buffer to database
     */
    async flushBuffer() {
        if (this.messageBuffer.size === 0) {
            return;
        }

        const entries = Array.from(this.messageBuffer.entries());
        this.messageBuffer.clear();

        try {
            // Process each buffered entry
            for (const [key, data] of entries) {
                await this.chatModel.recordActivity(
                    data.userId,
                    data.chatGroupId,
                    data.count
                );
            }

            console.log(`📊 Flushed ${entries.length} activity entries to database`);
        } catch (error) {
            console.error('Error flushing activity buffer:', error);
            
            // Re-add failed entries to buffer for retry
            for (const [key, data] of entries) {
                if (this.messageBuffer.has(key)) {
                    this.messageBuffer.get(key).count += data.count;
                } else {
                    this.messageBuffer.set(key, data);
                }
            }
        }
    }

    /**
     * Start periodic buffer flushing
     */
    startPeriodicFlush() {
        setInterval(async () => {
            await this.flushBuffer();
        }, this.flushInterval);

        console.log(`📊 Activity tracker started with ${this.flushInterval}ms flush interval`);
    }

    /**
     * Get activity statistics for a user
     * @param {string} telegramUserId - Telegram user ID
     * @param {string} telegramChatId - Telegram chat ID (optional)
     * @returns {Object} Activity statistics
     */
    async getUserActivityStats(telegramUserId, telegramChatId = null) {
        try {
            // First flush any pending data
            await this.flushBuffer();

            // Get stats from database
            return await this.chatModel.getUserRanking(telegramUserId, telegramChatId);
        } catch (error) {
            console.error('Error getting user activity stats:', error);
            return null;
        }
    }

    /**
     * Get leaderboard for a chat
     * @param {string} telegramChatId - Telegram chat ID
     * @param {number} limit - Number of top users to return
     * @returns {Array} Leaderboard data
     */
    async getLeaderboard(telegramChatId, limit = 10) {
        try {
            // First flush any pending data
            await this.flushBuffer();

            // Get leaderboard from database
            return await this.chatModel.getWeeklyLeaderboard(telegramChatId, limit);
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            return [];
        }
    }

    /**
     * Reset weekly statistics (called by cron job)
     */
    async resetWeeklyStats() {
        try {
            console.log('🔄 Resetting weekly statistics...');
            
            // Flush any pending data first
            await this.flushBuffer();

            // The database automatically handles weekly resets through the week_start field
            // This method can be extended to perform cleanup or archiving if needed
            
            console.log('✅ Weekly statistics reset completed');
        } catch (error) {
            console.error('Error resetting weekly stats:', error);
        }
    }

    /**
     * Get chat activity summary
     * @param {string} telegramChatId - Telegram chat ID
     * @returns {Object} Chat activity summary
     */
    async getChatActivitySummary(telegramChatId) {
        try {
            await this.flushBuffer();
            return await this.chatModel.getChatStats(telegramChatId);
        } catch (error) {
            console.error('Error getting chat activity summary:', error);
            return null;
        }
    }

    /**
     * Cleanup method to flush buffer before shutdown
     */
    async cleanup() {
        console.log('🧹 Cleaning up activity tracker...');
        await this.flushBuffer();
        console.log('✅ Activity tracker cleanup completed');
    }
}

export default ActivityTracker;
