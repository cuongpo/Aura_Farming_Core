import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

/**
 * Database class for managing SQLite database operations
 */
class Database {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.db = null;
        
        // Ensure data directory exists
        const dataDir = path.dirname(dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
    }

    /**
     * Initialize database connection and create tables
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('📊 Connected to SQLite database');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    /**
     * Create all necessary tables
     */
    async createTables() {
        const tables = [
            // Users table
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_user_id TEXT UNIQUE NOT NULL,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                wallet_address TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Chat groups table
            `CREATE TABLE IF NOT EXISTS chat_groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_chat_id TEXT UNIQUE NOT NULL,
                chat_title TEXT,
                chat_type TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Chat activity table for tracking messages
            `CREATE TABLE IF NOT EXISTS chat_activity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                chat_group_id INTEGER NOT NULL,
                message_count INTEGER DEFAULT 1,
                date DATE NOT NULL,
                week_start DATE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (chat_group_id) REFERENCES chat_groups (id),
                UNIQUE(user_id, chat_group_id, date)
            )`,

            // Weekly leaderboard cache
            `CREATE TABLE IF NOT EXISTS weekly_leaderboard (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                chat_group_id INTEGER NOT NULL,
                week_start DATE NOT NULL,
                total_messages INTEGER DEFAULT 0,
                rank_position INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (chat_group_id) REFERENCES chat_groups (id),
                UNIQUE(user_id, chat_group_id, week_start)
            )`,

            // Transaction history
            `CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                from_user_id INTEGER,
                to_user_id INTEGER, -- Allow NULL for external addresses
                from_address TEXT,
                to_address TEXT NOT NULL,
                amount TEXT NOT NULL,
                token_address TEXT NOT NULL,
                tx_hash TEXT UNIQUE,
                tx_type TEXT NOT NULL, -- 'tip', 'reward', 'transfer'
                status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'failed'
                chat_group_id INTEGER,
                admin_user_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (from_user_id) REFERENCES users (id),
                FOREIGN KEY (to_user_id) REFERENCES users (id),
                FOREIGN KEY (chat_group_id) REFERENCES chat_groups (id),
                FOREIGN KEY (admin_user_id) REFERENCES users (id)
            )`,

            // Admin permissions
            `CREATE TABLE IF NOT EXISTS admin_permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                chat_group_id INTEGER,
                permission_type TEXT NOT NULL, -- 'global', 'chat_admin', 'tip_admin'
                granted_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (chat_group_id) REFERENCES chat_groups (id),
                FOREIGN KEY (granted_by) REFERENCES users (id),
                UNIQUE(user_id, chat_group_id, permission_type)
            )`
        ];

        // Create indexes for better performance
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_user_id)',
            'CREATE INDEX IF NOT EXISTS idx_chat_groups_telegram_id ON chat_groups(telegram_chat_id)',
            'CREATE INDEX IF NOT EXISTS idx_chat_activity_user_date ON chat_activity(user_id, date)',
            'CREATE INDEX IF NOT EXISTS idx_chat_activity_week ON chat_activity(week_start, chat_group_id)',
            'CREATE INDEX IF NOT EXISTS idx_weekly_leaderboard_week ON weekly_leaderboard(week_start, chat_group_id)',
            'CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(to_user_id)',
            'CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(tx_hash)',
            'CREATE INDEX IF NOT EXISTS idx_admin_permissions_user ON admin_permissions(user_id)'
        ];

        try {
            // Create tables
            for (const tableSQL of tables) {
                await this.run(tableSQL);
            }

            // Create indexes
            for (const indexSQL of indexes) {
                await this.run(indexSQL);
            }

            console.log('✅ Database tables and indexes created successfully');
        } catch (error) {
            console.error('❌ Error creating database tables:', error);
            throw error;
        }
    }

    /**
     * Promisified database run method
     */
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    /**
     * Promisified database get method
     */
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    /**
     * Promisified database all method
     */
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * Close database connection
     */
    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('📊 Database connection closed');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * Get current week start date (Monday)
     */
    static getWeekStart(date = new Date()) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday.toISOString().split('T')[0];
    }

    /**
     * Get current date in YYYY-MM-DD format
     */
    static getCurrentDate() {
        return new Date().toISOString().split('T')[0];
    }
}

export default Database;
