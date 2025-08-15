import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found in .env file');
    process.exit(1);
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

console.log('🤖 Bot started! Send /start to the bot in a private message to get your user ID.');
console.log('📱 Your bot username should be visible in Telegram now.');
console.log('⏹️  Press Ctrl+C to stop when done.');

// Handle /start command to show user ID
bot.command('start', (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username;
    const firstName = ctx.from.first_name;
    
    console.log('\n✅ User Information:');
    console.log(`👤 User ID: ${userId}`);
    console.log(`📝 Username: @${username || 'N/A'}`);
    console.log(`🏷️  Name: ${firstName || 'N/A'}`);
    console.log(`\n📋 Add this to your .env file:`);
    console.log(`ADMIN_USER_IDS=${userId}`);
    
    ctx.reply(`
🎉 Hello ${firstName}!

Your Telegram User ID is: \`${userId}\`

This is what you need to add to your .env file as ADMIN_USER_IDS to become an admin of the bot.

You can now stop this script and update your .env file.
    `, { parse_mode: 'Markdown' });
});

// Handle any message to show user info
bot.on('message', (ctx) => {
    if (ctx.message.text && !ctx.message.text.startsWith('/')) {
        const userId = ctx.from.id;
        const username = ctx.from.username;
        const firstName = ctx.from.first_name;
        
        console.log(`\n📨 Message from User ID: ${userId} (@${username || 'N/A'}) - ${firstName || 'N/A'}`);
        
        ctx.reply(`Your User ID is: \`${userId}\``, { parse_mode: 'Markdown' });
    }
});

// Error handling
bot.catch((err, ctx) => {
    console.error('❌ Bot error:', err);
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
    console.log('✅ Bot is running and ready to receive messages!');
}).catch((error) => {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
});
