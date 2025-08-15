/**
 * UserModel - Handles user-related database operations
 */
class UserModel {
    constructor(database) {
        this.db = database;
    }

    /**
     * Create or update a user
     * @param {Object} userData - User data from Telegram
     * @returns {Object} User record
     */
    async createOrUpdateUser(userData) {
        const { id: telegramUserId, username, first_name, last_name } = userData;
        
        try {
            // Check if user exists
            const existingUser = await this.getUserByTelegramId(telegramUserId.toString());
            
            if (existingUser) {
                // Update existing user
                await this.db.run(
                    `UPDATE users SET 
                        username = ?, 
                        first_name = ?, 
                        last_name = ?, 
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE telegram_user_id = ?`,
                    [username || null, first_name || null, last_name || null, telegramUserId.toString()]
                );
                
                return await this.getUserByTelegramId(telegramUserId.toString());
            } else {
                // Create new user
                const result = await this.db.run(
                    `INSERT INTO users (telegram_user_id, username, first_name, last_name) 
                     VALUES (?, ?, ?, ?)`,
                    [telegramUserId.toString(), username || null, first_name || null, last_name || null]
                );
                
                return await this.getUserById(result.id);
            }
        } catch (error) {
            console.error('Error creating/updating user:', error);
            throw error;
        }
    }

    /**
     * Get user by internal ID
     * @param {number} id - Internal user ID
     * @returns {Object|null} User record
     */
    async getUserById(id) {
        try {
            return await this.db.get('SELECT * FROM users WHERE id = ?', [id]);
        } catch (error) {
            console.error('Error getting user by ID:', error);
            throw error;
        }
    }

    /**
     * Get user by Telegram ID
     * @param {string} telegramUserId - Telegram user ID
     * @returns {Object|null} User record
     */
    async getUserByTelegramId(telegramUserId) {
        try {
            return await this.db.get('SELECT * FROM users WHERE telegram_user_id = ?', [telegramUserId]);
        } catch (error) {
            console.error('Error getting user by Telegram ID:', error);
            throw error;
        }
    }

    /**
     * Get user by username
     * @param {string} username - Telegram username (without @)
     * @returns {Object|null} User record
     */
    async getUserByUsername(username) {
        try {
            return await this.db.get('SELECT * FROM users WHERE username = ?', [username]);
        } catch (error) {
            console.error('Error getting user by username:', error);
            throw error;
        }
    }

    /**
     * Update user's wallet address
     * @param {string} telegramUserId - Telegram user ID
     * @param {string} walletAddress - Wallet address
     * @returns {boolean} Success status
     */
    async updateUserWallet(telegramUserId, walletAddress) {
        try {
            const result = await this.db.run(
                'UPDATE users SET wallet_address = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_user_id = ?',
                [walletAddress, telegramUserId]
            );
            
            return result.changes > 0;
        } catch (error) {
            console.error('Error updating user wallet:', error);
            throw error;
        }
    }

    /**
     * Get all users with wallet addresses
     * @returns {Array} Array of users with wallets
     */
    async getUsersWithWallets() {
        try {
            return await this.db.all('SELECT * FROM users WHERE wallet_address IS NOT NULL');
        } catch (error) {
            console.error('Error getting users with wallets:', error);
            throw error;
        }
    }

    /**
     * Get user statistics
     * @param {string} telegramUserId - Telegram user ID
     * @param {string} chatId - Chat group ID (optional)
     * @returns {Object} User statistics
     */
    async getUserStats(telegramUserId, chatId = null) {
        try {
            const user = await this.getUserByTelegramId(telegramUserId);
            if (!user) return null;

            let whereClause = 'WHERE ca.user_id = ?';
            let params = [user.id];

            if (chatId) {
                whereClause += ' AND cg.telegram_chat_id = ?';
                params.push(chatId);
            }

            const stats = await this.db.get(`
                SELECT 
                    COUNT(DISTINCT ca.date) as active_days,
                    SUM(ca.message_count) as total_messages,
                    AVG(ca.message_count) as avg_messages_per_day,
                    MAX(ca.message_count) as max_messages_in_day,
                    MIN(ca.created_at) as first_activity,
                    MAX(ca.updated_at) as last_activity
                FROM chat_activity ca
                JOIN chat_groups cg ON ca.chat_group_id = cg.id
                ${whereClause}
            `, params);

            return {
                user: user,
                stats: stats || {
                    active_days: 0,
                    total_messages: 0,
                    avg_messages_per_day: 0,
                    max_messages_in_day: 0,
                    first_activity: null,
                    last_activity: null
                }
            };
        } catch (error) {
            console.error('Error getting user stats:', error);
            throw error;
        }
    }

    /**
     * Delete user (for GDPR compliance)
     * @param {string} telegramUserId - Telegram user ID
     * @returns {boolean} Success status
     */
    async deleteUser(telegramUserId) {
        try {
            const result = await this.db.run('DELETE FROM users WHERE telegram_user_id = ?', [telegramUserId]);
            return result.changes > 0;
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    /**
     * Get all users
     * @returns {Promise<Array>} Array of all users
     */
    async getAllUsers() {
        try {
            return await this.db.all('SELECT * FROM users ORDER BY created_at DESC');
        } catch (error) {
            console.error('Error getting all users:', error);
            throw error;
        }
    }
}

export default UserModel;
