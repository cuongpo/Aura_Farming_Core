import Database from './Database.js';

class QuestModel {
    constructor(database) {
        this.db = database;
    }

    /**
     * Create quest-related tables
     */
    async createTables() {
        // Daily quests table
        await this.db.run(`
            CREATE TABLE IF NOT EXISTS daily_quests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                quest_date TEXT NOT NULL,
                quest_type TEXT NOT NULL DEFAULT 'daily_chat',
                completed BOOLEAN DEFAULT FALSE,
                completed_at DATETIME,
                reward_amount INTEGER DEFAULT 0,
                claimed BOOLEAN DEFAULT FALSE,
                claimed_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, quest_date, quest_type)
            )
        `);

        // Daily chests table
        await this.db.run(`
            CREATE TABLE IF NOT EXISTS daily_chests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                chest_date TEXT NOT NULL,
                eligible BOOLEAN DEFAULT FALSE,
                opened BOOLEAN DEFAULT FALSE,
                reward_amount INTEGER DEFAULT 0,
                opened_at DATETIME,
                transaction_hash TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, chest_date)
            )
        `);

        // Quest activity tracking
        await this.db.run(`
            CREATE TABLE IF NOT EXISTS quest_activity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                activity_date TEXT NOT NULL,
                chat_id TEXT NOT NULL,
                message_count INTEGER DEFAULT 1,
                last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, activity_date, chat_id)
            )
        `);

        // Create indexes for better performance
        await this.db.run('CREATE INDEX IF NOT EXISTS idx_daily_quests_user_date ON daily_quests(user_id, quest_date)');
        await this.db.run('CREATE INDEX IF NOT EXISTS idx_daily_chests_user_date ON daily_chests(user_id, chest_date)');
        await this.db.run('CREATE INDEX IF NOT EXISTS idx_quest_activity_user_date ON quest_activity(user_id, activity_date)');
    }

    /**
     * Record user activity for quest tracking
     */
    async recordActivity(userId, chatId) {
        const today = new Date().toISOString().split('T')[0];
        
        try {
            // Insert or update activity for today
            await this.db.run(`
                INSERT INTO quest_activity (user_id, activity_date, chat_id, message_count, last_message_at)
                VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, activity_date, chat_id) 
                DO UPDATE SET 
                    message_count = message_count + 1,
                    last_message_at = CURRENT_TIMESTAMP
            `, [userId, today, chatId]);

            // Check if user completed daily quest
            await this.checkDailyQuestCompletion(userId, today);
            
        } catch (error) {
            console.error('Error recording quest activity:', error);
        }
    }

    /**
     * Check and mark daily quest as completed
     */
    async checkDailyQuestCompletion(userId, date) {
        try {
            // Check if user has any activity today
            const activity = await this.db.get(`
                SELECT COUNT(*) as message_count 
                FROM quest_activity 
                WHERE user_id = ? AND activity_date = ?
            `, [userId, date]);

            if (activity && activity.message_count > 0) {
                // Mark daily quest as completed
                await this.db.run(`
                    INSERT INTO daily_quests (user_id, quest_date, completed, completed_at)
                    VALUES (?, ?, TRUE, CURRENT_TIMESTAMP)
                    ON CONFLICT(user_id, quest_date, quest_type) 
                    DO UPDATE SET 
                        completed = TRUE,
                        completed_at = CURRENT_TIMESTAMP
                `, [userId, date]);

                // Make user eligible for daily chest
                await this.db.run(`
                    INSERT INTO daily_chests (user_id, chest_date, eligible)
                    VALUES (?, ?, TRUE)
                    ON CONFLICT(user_id, chest_date) 
                    DO UPDATE SET eligible = TRUE
                `, [userId, date]);
            }
        } catch (error) {
            console.error('Error checking quest completion:', error);
        }
    }

    /**
     * Get user's quest status for today
     */
    async getUserQuestStatus(userId) {
        const today = new Date().toISOString().split('T')[0];
        
        try {
            const quest = await this.db.get(`
                SELECT * FROM daily_quests 
                WHERE user_id = ? AND quest_date = ?
            `, [userId, today]);

            const chest = await this.db.get(`
                SELECT * FROM daily_chests 
                WHERE user_id = ? AND chest_date = ?
            `, [userId, today]);

            const activity = await this.db.get(`
                SELECT COUNT(*) as message_count 
                FROM quest_activity 
                WHERE user_id = ? AND activity_date = ?
            `, [userId, today]);

            return {
                date: today,
                quest: quest || { completed: false, claimed: false },
                chest: chest || { eligible: false, opened: false },
                messageCount: activity ? activity.message_count : 0
            };
        } catch (error) {
            console.error('Error getting quest status:', error);
            return null;
        }
    }

    /**
     * Open daily chest and get random reward
     */
    async openDailyChest(userId) {
        const today = new Date().toISOString().split('T')[0];
        
        try {
            // Check if user is eligible and hasn't opened chest yet
            const chest = await this.db.get(`
                SELECT * FROM daily_chests 
                WHERE user_id = ? AND chest_date = ? AND eligible = TRUE AND opened = FALSE
            `, [userId, today]);

            if (!chest) {
                return { success: false, error: 'Not eligible or already opened' };
            }

            // Generate random reward (0-5 AURA tokens)
            const rewardAmount = Math.floor(Math.random() * 6); // 0 to 5
            
            // Mark chest as opened
            await this.db.run(`
                UPDATE daily_chests 
                SET opened = TRUE, reward_amount = ?, opened_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND chest_date = ?
            `, [rewardAmount, userId, today]);

            return {
                success: true,
                reward: rewardAmount,
                date: today
            };
        } catch (error) {
            console.error('Error opening chest:', error);
            return { success: false, error: 'Database error' };
        }
    }

    /**
     * Update chest with transaction hash after claiming
     */
    async updateChestTransaction(userId, date, transactionHash) {
        try {
            await this.db.run(`
                UPDATE daily_chests 
                SET transaction_hash = ?
                WHERE user_id = ? AND chest_date = ?
            `, [transactionHash, userId, date]);
        } catch (error) {
            console.error('Error updating chest transaction:', error);
        }
    }

    /**
     * Get user's quest history
     */
    async getUserQuestHistory(userId, limit = 7) {
        try {
            const quests = await this.db.all(`
                SELECT 
                    dq.quest_date,
                    dq.completed,
                    dq.completed_at,
                    dc.opened,
                    dc.reward_amount,
                    dc.opened_at,
                    dc.transaction_hash
                FROM daily_quests dq
                LEFT JOIN daily_chests dc ON dq.user_id = dc.user_id AND dq.quest_date = dc.chest_date
                WHERE dq.user_id = ?
                ORDER BY dq.quest_date DESC
                LIMIT ?
            `, [userId, limit]);

            return quests;
        } catch (error) {
            console.error('Error getting quest history:', error);
            return [];
        }
    }

    /**
     * Get quest statistics
     */
    async getQuestStats(userId) {
        try {
            const stats = await this.db.get(`
                SELECT 
                    COUNT(*) as total_quests,
                    SUM(CASE WHEN completed = TRUE THEN 1 ELSE 0 END) as completed_quests,
                    SUM(CASE WHEN dc.opened = TRUE THEN dc.reward_amount ELSE 0 END) as total_aura_earned
                FROM daily_quests dq
                LEFT JOIN daily_chests dc ON dq.user_id = dc.user_id AND dq.quest_date = dc.chest_date
                WHERE dq.user_id = ?
            `, [userId]);

            return stats || { total_quests: 0, completed_quests: 0, total_aura_earned: 0 };
        } catch (error) {
            console.error('Error getting quest stats:', error);
            return { total_quests: 0, completed_quests: 0, total_aura_earned: 0 };
        }
    }
}

export default QuestModel;
