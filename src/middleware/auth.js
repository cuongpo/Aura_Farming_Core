/**
 * Authentication and authorization middleware for the Telegram bot
 */

/**
 * Middleware to ensure user is registered in the database
 * @param {Object} userModel - UserModel instance
 * @param {Object} chatModel - ChatModel instance
 */
export function requireUser(userModel, chatModel) {
    return async (ctx, next) => {
        try {
            // Create or update user in database
            const user = await userModel.createOrUpdateUser(ctx.from);
            ctx.user = user;

            // If this is a group chat, create or update chat group
            if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
                const chatGroup = await chatModel.createOrUpdateChatGroup(ctx.chat);
                ctx.chatGroup = chatGroup;
            }

            await next();
        } catch (error) {
            console.error('Error in requireUser middleware:', error);
            await ctx.reply('❌ An error occurred while processing your request. Please try again.');
        }
    };
}

/**
 * Middleware to check if user is an admin
 * @param {Array} adminUserIds - Array of admin Telegram user IDs
 */
export function requireAdmin(adminUserIds) {
    return async (ctx, next) => {
        const userId = ctx.from.id.toString();
        
        if (!adminUserIds.includes(userId)) {
            await ctx.reply('❌ This command is only available to administrators.');
            return;
        }

        await next();
    };
}

/**
 * Middleware to check if user is a chat administrator
 */
export function requireChatAdmin() {
    return async (ctx, next) => {
        try {
            // Only apply in group chats
            if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
                await next();
                return;
            }

            // Check if user is chat administrator
            const chatMember = await ctx.getChatMember(ctx.from.id);
            
            if (chatMember.status === 'creator' || chatMember.status === 'administrator') {
                await next();
            } else {
                await ctx.reply('❌ This command is only available to chat administrators.');
            }
        } catch (error) {
            console.error('Error checking chat admin status:', error);
            await ctx.reply('❌ Unable to verify admin status. Please try again.');
        }
    };
}

/**
 * Middleware to ensure command is used in a group chat
 */
export function requireGroupChat() {
    return async (ctx, next) => {
        if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
            await ctx.reply('❌ This command can only be used in group chats.');
            return;
        }

        await next();
    };
}

/**
 * Middleware to ensure command is used in a private chat
 */
export function requirePrivateChat() {
    return async (ctx, next) => {
        if (ctx.chat.type !== 'private') {
            await ctx.reply('❌ This command can only be used in private chats.');
            return;
        }

        await next();
    };
}

/**
 * Middleware for rate limiting
 * @param {number} maxRequests - Maximum requests per time window
 * @param {number} windowMs - Time window in milliseconds
 */
export function rateLimit(maxRequests = 10, windowMs = 60000) {
    const userRequests = new Map();

    return async (ctx, next) => {
        const userId = ctx.from.id.toString();
        const now = Date.now();
        
        // Clean up old entries
        for (const [key, data] of userRequests.entries()) {
            if (now - data.firstRequest > windowMs) {
                userRequests.delete(key);
            }
        }

        // Check user's request count
        const userRequestData = userRequests.get(userId);
        
        if (!userRequestData) {
            userRequests.set(userId, {
                count: 1,
                firstRequest: now
            });
        } else {
            userRequestData.count++;
            
            if (userRequestData.count > maxRequests) {
                await ctx.reply('⏰ You are sending commands too quickly. Please wait a moment and try again.');
                return;
            }
        }

        await next();
    };
}

/**
 * Middleware to log all interactions
 */
export function logger() {
    return async (ctx, next) => {
        const start = Date.now();
        const userId = ctx.from?.id;
        const username = ctx.from?.username;
        const chatId = ctx.chat?.id;
        const chatType = ctx.chat?.type;
        const messageText = ctx.message?.text || ctx.callbackQuery?.data || 'N/A';

        console.log(`📨 [${new Date().toISOString()}] User ${userId} (@${username}) in ${chatType} chat ${chatId}: ${messageText}`);

        try {
            await next();
            const duration = Date.now() - start;
            console.log(`✅ [${new Date().toISOString()}] Request completed in ${duration}ms`);
        } catch (error) {
            const duration = Date.now() - start;
            console.error(`❌ [${new Date().toISOString()}] Request failed after ${duration}ms:`, error);
            throw error;
        }
    };
}

/**
 * Error handling middleware
 */
export function errorHandler() {
    return async (ctx, next) => {
        try {
            await next();
        } catch (error) {
            console.error('Unhandled error in bot:', error);
            
            try {
                await ctx.reply('❌ An unexpected error occurred. The administrators have been notified.');
            } catch (replyError) {
                console.error('Failed to send error message to user:', replyError);
            }
        }
    };
}
