import Database from '../src/models/Database.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateDatabase() {
    console.log('🔄 Migrating database schema...');
    
    const dbPath = path.join(__dirname, '..', 'data', 'bot.db');
    const database = new Database(dbPath);
    
    try {
        await database.initialize();
        console.log('✅ Connected to database');
        
        // Check if we need to migrate the transactions table
        const tableInfo = await database.all("PRAGMA table_info(transactions)");
        console.log('📋 Current transactions table schema:');
        tableInfo.forEach(col => {
            console.log(`   ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : 'NULL'} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
        });
        
        // Check if to_user_id is NOT NULL
        const toUserIdColumn = tableInfo.find(col => col.name === 'to_user_id');
        if (toUserIdColumn && toUserIdColumn.notnull === 1) {
            console.log('\n🔧 Need to migrate: to_user_id is currently NOT NULL');
            
            // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
            console.log('📝 Creating backup of transactions table...');
            
            // Create backup table
            await database.run(`CREATE TABLE transactions_backup AS SELECT * FROM transactions`);
            console.log('✅ Backup created');
            
            // Drop original table
            await database.run(`DROP TABLE transactions`);
            console.log('✅ Original table dropped');
            
            // Create new table with correct schema
            await database.run(`
                CREATE TABLE transactions (
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
                )
            `);
            console.log('✅ New table created with correct schema');
            
            // Restore data from backup
            await database.run(`
                INSERT INTO transactions 
                SELECT * FROM transactions_backup
            `);
            console.log('✅ Data restored from backup');
            
            // Drop backup table
            await database.run(`DROP TABLE transactions_backup`);
            console.log('✅ Backup table cleaned up');
            
            // Recreate indexes
            await database.run('CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(to_user_id)');
            await database.run('CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(tx_hash)');
            console.log('✅ Indexes recreated');
            
            console.log('\n🎉 Migration completed successfully!');
            
        } else {
            console.log('\n✅ No migration needed - to_user_id already allows NULL');
        }
        
        // Verify the new schema
        const newTableInfo = await database.all("PRAGMA table_info(transactions)");
        console.log('\n📋 Updated transactions table schema:');
        newTableInfo.forEach(col => {
            console.log(`   ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : 'NULL'} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
        });
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        if (database.db) {
            database.db.close();
            console.log('📝 Database connection closed');
        }
    }
}

migrateDatabase().catch(console.error);
