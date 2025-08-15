import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found in .env file');
    process.exit(1);
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const adminUserIds = process.env.ADMIN_USER_IDS ? 
    process.env.ADMIN_USER_IDS.split(',').map(id => id.trim()) : [];

console.log('🤖 Starting basic bot (without smart contract features)...');
console.log('👑 Admin User IDs:', adminUserIds);

// Basic commands that work without smart contract
bot.command('start', (ctx) => {
    ctx.reply(`
🌟 Welcome to Aura Farming Bot!

I'm currently in setup mode. Here's what's available:

**Working Commands:**
• /start - This welcome message
• /help - Show help
• /status - Check bot status
• /ping - Test bot response

**Coming Soon (after contract deployment):**
• /leaderboard - Weekly top users
• /ranking - Your rank and stats  
• /wallet - Your wallet info
• /tip - Send rewards (admin only)

🔧 **Setup Status:**
✅ Bot token configured
✅ Admin user configured (${ctx.from.first_name})
⏳ Waiting for smart contract deployment

Contact admin for full setup completion!
    `);
});

bot.command('help', (ctx) => {
    ctx.reply(`
🤖 **Aura Farming Bot Help**

**Current Commands:**
/start - Welcome message
/help - This help message
/status - Check setup status
/ping - Test bot response

**After Full Setup:**
/leaderboard - View weekly leaderboard
/ranking - Check your ranking
/wallet - View wallet and balance
/tip @user amount - Send rewards (admin)

🔧 Bot is in setup mode. Full features coming soon!
    `);
});

bot.command('status', (ctx) => {
    const isAdmin = adminUserIds.includes(ctx.from.id.toString());
    
    ctx.reply(`
📊 **Bot Status**

✅ Bot Token: Configured
✅ Admin Users: ${adminUserIds.length} configured
${isAdmin ? '👑 You are an admin!' : '👤 You are a regular user'}

🔧 **Setup Progress:**
✅ Telegram bot running
✅ Admin permissions set
⏳ Smart contract deployment pending
⏳ Database initialization pending
⏳ Full features pending

Contact admin to complete setup!
    `);
});

bot.command('ping', (ctx) => {
    const start = Date.now();
    ctx.reply('🏓 Pong!').then(() => {
        const end = Date.now();
        console.log(`📊 Response time: ${end - start}ms`);
    });
});

// Admin-only test command
bot.command('admin', (ctx) => {
    const isAdmin = adminUserIds.includes(ctx.from.id.toString());
    
    if (!isAdmin) {
        return ctx.reply('❌ This command is only for administrators.');
    }
    
    ctx.reply(`
👑 **Admin Panel**

You are confirmed as an admin!

**Admin Info:**
• User ID: ${ctx.from.id}
• Username: @${ctx.from.username || 'N/A'}
• Name: ${ctx.from.first_name || 'N/A'}

**Next Steps:**
1. Get testnet tCORE for wallet: 0x7784aE76DcCbf05A7D49A745D9F22E5C0f89dDd3
2. Deploy smart contract: \`npm run deploy-all-core\`
3. Start full bot: \`npm start\`

🔗 Faucet: https://scan.test2.btcs.network/faucet
    `);
});

// Handle group additions
bot.on('new_chat_members', (ctx) => {
    const newMembers = ctx.message.new_chat_members;
    
    for (const member of newMembers) {
        if (member.id === ctx.botInfo.id) {
            ctx.reply(`
🎉 Thanks for adding me to ${ctx.chat.title}!

I'm currently in setup mode. Once fully configured, I'll:
• Track chat activity for weekly leaderboards
• Allow admins to reward active users with USDT
• Show rankings and statistics

Use /help to see available commands.
            `);
        }
    }
});

// Basic message logging
bot.on('message', (ctx) => {
    if (ctx.message.text && !ctx.message.text.startsWith('/')) {
        console.log(`📨 Message from ${ctx.from.first_name} (@${ctx.from.username}): ${ctx.message.text.substring(0, 50)}...`);
    }
});

// Error handling
bot.catch((err, ctx) => {
    console.error('❌ Bot error:', err);
    if (ctx) {
        ctx.reply('❌ An error occurred. Please try again.').catch(() => {});
    }
});

// Graceful shutdown
process.once('SIGINT', () => {
    console.log('\n🛑 Stopping bot...');
    bot.stop('SIGINT');
    process.exit(0);
});

process.once('SIGTERM', () => {
    console.log('\n🛑 Stopping bot...');
    bot.stop('SIGTERM');
    process.exit(0);
});

// Start the bot
bot.launch().then(() => {
    console.log('✅ Basic bot is running!');
    console.log('🔧 In setup mode - limited functionality');
    console.log('📱 Try /start, /help, /status, /ping commands');
    console.log('⏹️  Press Ctrl+C to stop');
}).catch((error) => {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
});
