import { Telegraf } from 'telegraf';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import cron from 'node-cron';

// Import our modules
import Database from './models/Database.js';
import UserModel from './models/UserModel.js';
import ChatModel from './models/ChatModel.js';
import QuestModel from './models/QuestModel.js';
import WalletService from './services/WalletService.js';
import AccountAbstractionService from './services/AccountAbstractionService.js';
import ActivityTracker from './services/ActivityTracker.js';
import AuraService from './services/AuraService.js';

// Import middleware
import {
    requireUser,
    requireAdmin,
    requireGroupChat,
    rateLimit,
    logger,
    errorHandler
} from './middleware/auth.js';

// Import commands
import { createLeaderboardCommand } from './commands/leaderboard.js';
import { createRankingCommand } from './commands/ranking.js';
import { createWalletCommand, createFundWalletCommand, createBalanceCommand } from './commands/wallet.js';
import { createTipCommand, createTipHistoryCommand } from './commands/tip.js';
import { createTransferCoreCommand, createTransferUSDTCommand } from './commands/transfer.js';
import { createQuestCommand, createOpenChestCommand, createClaimAuraCommand, createQuestHistoryCommand } from './commands/quest.js';
import WebServer from './webserver.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
    'TELEGRAM_BOT_TOKEN',
    'CORE_TESTNET_RPC_URL',
    'DATABASE_PATH'
];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`❌ Missing required environment variable: ${envVar}`);
        process.exit(1);
    }
}

class AuraFarmingBot {
    constructor() {
        this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
        this.database = null;
        this.userModel = null;
        this.chatModel = null;
        this.walletService = null;
        this.accountAbstractionService = null;
        this.webServer = null;
        this.activityTracker = null;
        this.adminUserIds = process.env.ADMIN_USER_IDS ? 
            process.env.ADMIN_USER_IDS.split(',').map(id => id.trim()) : [];
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Aura Farming Bot...');

            // Initialize database
            this.database = new Database(process.env.DATABASE_PATH);
            await this.database.initialize();
            console.log('📊 Connected to SQLite database');

            // Initialize models
            this.userModel = new UserModel(this.database);
            this.chatModel = new ChatModel(this.database);
            this.questModel = new QuestModel(this.database);

            // Create database tables
            await this.database.createTables();
            await this.questModel.createTables();
            console.log('✅ Database tables and indexes created successfully');

            // Initialize blockchain provider and services
            const provider = new ethers.JsonRpcProvider(process.env.CORE_TESTNET_RPC_URL);

            // Initialize both wallet services (fallback and account abstraction)
            this.walletService = new WalletService(provider, process.env.ENTRY_POINT_ADDRESS);

            // Initialize Account Abstraction service if factory is deployed
            if (process.env.SIMPLE_ACCOUNT_FACTORY_ADDRESS) {
                this.accountAbstractionService = new AccountAbstractionService(
                    provider,
                    process.env.ENTRY_POINT_ADDRESS,
                    process.env.SIMPLE_ACCOUNT_FACTORY_ADDRESS
                );
                console.log('✅ Account Abstraction service initialized');
            } else {
                console.log('⚠️  Account Abstraction factory not deployed, using fallback wallet service');
            }

            // Initialize AURA service if contract is deployed
            if (process.env.AURA_TOKEN_CONTRACT_ADDRESS) {
                this.auraService = new AuraService(
                    provider,
                    process.env.AURA_TOKEN_CONTRACT_ADDRESS,
                    process.env.PRIVATE_KEY
                );
                console.log('✅ AURA service initialized');
            } else {
                console.log('⚠️  AURA token not deployed, quest rewards disabled');
            }

            // Initialize activity tracker
            this.activityTracker = new ActivityTracker(this.chatModel);

            // Setup middleware
            this.setupMiddleware();

            // Setup commands
            this.setupCommands();

            // Setup message handlers
            this.setupMessageHandlers();

            // Setup cron jobs
            this.setupCronJobs();

        // Initialize web server for Telegram Web App
        this.webServer = new WebServer(
            this.accountAbstractionService,
            this.userModel,
            this.database,
            this.botToken
        );
        await this.webServer.start();

        // Set menu button for web app if HTTPS URL is available
        const webAppUrl = process.env.WEB_APP_URL;
        if (webAppUrl && webAppUrl.startsWith('https://')) {
            try {
                await this.bot.telegram.setChatMenuButton({
                    menu_button: {
                        type: 'web_app',
                        text: '🚀 Open Wallet',
                        web_app: { url: webAppUrl }
                    }
                });
                console.log('✅ Web App menu button configured');
            } catch (error) {
                console.log('⚠️ Could not set menu button:', error.message);
            }
        } else {
            console.log('ℹ️ Web App URL not configured or not HTTPS - menu button disabled');
        }

            console.log('✅ Bot initialization completed');

        // For Render deployment - ensure the service stays alive
        if (process.env.NODE_ENV === 'production') {
            console.log('🌐 Production mode - keeping service alive');
        }
        } catch (error) {
            console.error('❌ Failed to initialize bot:', error);
            throw error;
        }
    }

    setupMiddleware() {
        // Global middleware
        this.bot.use(logger());
        this.bot.use(errorHandler());
        this.bot.use(rateLimit(20, 60000)); // 20 requests per minute
        this.bot.use(requireUser(this.userModel, this.chatModel));
    }

    setupCommands() {
        // Start command with Web App button
        this.bot.command('start', async (ctx) => {
            const welcomeMessage = `
🌟 Welcome to Aura Farming Bot!

I help track chat activity and reward active users with USDT tokens and AURA tokens on Core testnet.

**Available Commands:**
• /leaderboard - View top 10 most active users this week
• /ranking - Check your current rank and statistics
• /wallet - View your wallet address and balance
• /quest - View daily quest status and open chests
• /help - Show this help message

**🎮 Quest System:**
• /quest - Check daily quest progress
• /openchest - Open daily chest (0-5 AURA reward)
• /questhistory - View quest completion history

**For Admins:**
• /tip @username amount - Send USDT rewards to users

Add me to your group chat to start tracking activity and earning rewards! 🎉
            `;

            // Include web app button if URL is available and HTTPS
            const webAppUrl = process.env.WEB_APP_URL;
            const inlineKeyboard = [
                [
                    {
                        text: '📊 Leaderboard',
                        callback_data: 'leaderboard'
                    },
                    {
                        text: '💼 Wallet',
                        callback_data: 'wallet'
                    }
                ]
            ];

            // Add web app button if we have an HTTPS URL
            if (webAppUrl && webAppUrl.startsWith('https://')) {
                inlineKeyboard.unshift([
                    {
                        text: '🚀 Open Wallet App',
                        web_app: { url: webAppUrl }
                    }
                ]);
            }

            await ctx.reply(welcomeMessage, {
                reply_markup: {
                    inline_keyboard: inlineKeyboard
                }
            });
        });

        // Help command
        this.bot.command('help', async (ctx) => {
            await ctx.replyWithHTML(`
<b>🤖 Aura Farming Bot Help</b>

<b>User Commands:</b>
/start - Get started with the bot
/leaderboard - View weekly top 10 users
/ranking - Check your current rank
/wallet - View wallet info and balance
/transfer_core &lt;wallet_address&gt; amount - Send tCORE to wallet address
/transfer_usdt &lt;wallet_address&gt; amount - Send mUSDT to wallet address
/tip @username amount - Send USDT to another user
/help - Show this help message

<b>Admin Commands:</b>
/fund @username amount - Fund user with tCORE
/balance @username - Check user balance

<b>Transfer Examples:</b>
/transfer_core 0x1234...5678 0.01 - Send 0.01 tCORE to wallet address
/transfer_usdt 0xabcd...ef12 100 Thanks! - Send 100 mUSDT with message

<b>How it works:</b>
• Send messages in group chats to earn activity points
• Weekly leaderboard resets every Monday
• Transfer ETH/USDT to any wallet address directly
• Users can tip each other with USDT tokens
• Each user gets a unique wallet address automatically

<b>Support:</b>
If you encounter any issues, please contact the administrators.
            `);
        });

        // Leaderboard command (group chats only)
        this.bot.command('leaderboard',
            requireGroupChat(),
            createLeaderboardCommand(this.activityTracker, this.database)
        );

        // Ranking command
        this.bot.command('ranking',
            createRankingCommand(this.activityTracker, this.userModel, this.database)
        );

        // Wallet command
        this.bot.command('wallet',
            createWalletCommand(this.walletService, this.accountAbstractionService, this.userModel)
        );

        // Tip command (all users can tip each other)
        this.bot.command('tip',
            createTipCommand(this.walletService, this.accountAbstractionService, this.userModel, this.database)
        );

        // Additional admin commands
        this.bot.command('fund',
            requireAdmin(this.adminUserIds),
            createFundWalletCommand(this.walletService, this.userModel, this.adminUserIds)
        );

        this.bot.command('balance',
            requireAdmin(this.adminUserIds),
            createBalanceCommand(this.walletService, this.userModel, this.adminUserIds)
        );

        this.bot.command('tiphistory',
            createTipHistoryCommand(this.database, this.adminUserIds)
        );

        // Transfer commands (for all users)
        this.bot.command('transfer_core',
            createTransferCoreCommand(this.walletService, this.accountAbstractionService, this.userModel, this.database)
        );

        this.bot.command('transfer_usdt',
            createTransferUSDTCommand(this.walletService, this.accountAbstractionService, this.userModel, this.database)
        );

        // Quest commands
        this.bot.command('quest', createQuestCommand(this.questModel));
        this.bot.command('openchest', createOpenChestCommand(this.questModel, this.auraService));
        this.bot.command('claimaura', createClaimAuraCommand(this.questModel, this.auraService, this.userModel));
        this.bot.command('questhistory', createQuestHistoryCommand(this.questModel));

        // Callback query handlers for inline buttons
        this.bot.action('leaderboard', async (ctx) => {
            await ctx.answerCbQuery();
            const leaderboardCommand = createLeaderboardCommand(this.activityTracker);
            await leaderboardCommand(ctx);
        });

        this.bot.action('wallet', async (ctx) => {
            await ctx.answerCbQuery();
            const walletCommand = createWalletCommand(this.walletService, this.accountAbstractionService);
            await walletCommand(ctx);
        });

        // Debug command to test activity tracking
        this.bot.command('testactivity', requireAdmin(this.adminUserIds), async (ctx) => {
            try {
                if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
                    return await ctx.reply('❌ This command only works in group chats.');
                }

                // Manually add some test activity
                const userId = ctx.user.id;
                const chatGroupId = ctx.chatGroup.id;

                await this.chatModel.recordActivity(userId, chatGroupId, 5);
                await ctx.reply('✅ Added 5 test messages to your activity count. Try /leaderboard now!');

            } catch (error) {
                console.error('Error in testactivity command:', error);
                await ctx.reply('❌ Error adding test activity.');
            }
        });
    }

    setupMessageHandlers() {
        // Track all text messages for activity and quests
        this.bot.on('text', async (ctx) => {
            await this.activityTracker.trackMessage(ctx);

            // Track quest activity for group messages
            if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
                await this.questModel.recordActivity(ctx.from.id.toString(), ctx.chat.id.toString());
            }
        });

        // Handle new chat members
        this.bot.on('new_chat_members', async (ctx) => {
            const newMembers = ctx.message.new_chat_members;
            
            for (const member of newMembers) {
                if (member.id === ctx.botInfo.id) {
                    // Bot was added to the group
                    await ctx.reply(`
🎉 Thanks for adding me to ${ctx.chat.title}!

I'll start tracking chat activity for the weekly leaderboard. Use /help to see available commands.

Admins can use /tip to reward active users with USDT tokens! 💰
                    `);
                }
            }
        });
    }

    setupCronJobs() {
        // Reset weekly statistics every Monday at 00:00
        cron.schedule('0 0 * * 1', async () => {
            console.log('🔄 Running weekly reset...');
            await this.activityTracker.resetWeeklyStats();
        });

        // Flush activity buffer every 5 minutes as backup
        cron.schedule('*/5 * * * *', async () => {
            await this.activityTracker.flushBuffer();
        });

        console.log('⏰ Cron jobs scheduled');
    }

    async start() {
        try {
            await this.initialize();

            // Graceful shutdown handling
            process.once('SIGINT', () => this.stop('SIGINT'));
            process.once('SIGTERM', () => this.stop('SIGTERM'));

            // For Render deployment - start bot without blocking
            if (process.env.NODE_ENV === 'production') {
                console.log('🌐 Production mode - starting bot asynchronously');
                this.bot.launch().then(() => {
                    console.log('🤖 Bot is running in production!');
                }).catch(error => {
                    console.error('❌ Bot failed to start:', error.message);
                    // Don't exit - web server is still running
                });
            } else {
                await this.bot.launch();
                console.log('🤖 Bot is running!');
                console.log('Press Ctrl+C to stop the bot');
            }
        } catch (error) {
            console.error('❌ Failed to start bot:', error);
            if (process.env.NODE_ENV !== 'production') {
                process.exit(1);
            }
        }
    }

    async stop(signal) {
        console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
        
        try {
            // Cleanup activity tracker
            if (this.activityTracker) {
                await this.activityTracker.cleanup();
            }

            // Close database connection
            if (this.database) {
                await this.database.close();
            }

            // Stop the bot
            this.bot.stop(signal);
            
            console.log('✅ Bot stopped gracefully');
            process.exit(0);
        } catch (error) {
            console.error('❌ Error during shutdown:', error);
            process.exit(1);
        }
    }
}

// Start the bot
const bot = new AuraFarmingBot();
bot.start();
