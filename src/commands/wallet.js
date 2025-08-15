/**
 * Wallet command implementation
 */

/**
 * Format wallet address for display (show first 6 and last 4 characters)
 * @param {string} address - Wallet address
 * @returns {string} Formatted address
 */
function formatAddress(address) {
    if (!address) return 'N/A';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Format balance for display
 * @param {string} balance - Balance amount
 * @param {string} symbol - Token symbol
 * @returns {string} Formatted balance
 */
function formatBalance(balance, symbol = 'mUSDT') {
    const numBalance = parseFloat(balance);
    if (numBalance === 0) return `0 ${symbol}`;
    if (numBalance < 0.001) return `< 0.001 ${symbol}`;
    return `${numBalance.toFixed(3)} ${symbol}`;
}

/**
 * Create wallet info message
 * @param {Object} walletInfo - Wallet information
 * @param {string} ethBalance - ETH balance
 * @param {string} tokenBalance - Token balance
 * @param {string} tokenSymbol - Token symbol
 * @returns {string} Formatted wallet message
 */
function createWalletMessage(walletInfo, ethBalance, tokenBalance, tokenSymbol = 'mUSDT') {
    const shortAddress = formatAddress(walletInfo.address);
    const fullAddress = walletInfo.address;

    const walletType = walletInfo.isSmartWallet ?
        (walletInfo.isDeployed ? '🔐 Smart Contract Wallet (Deployed)' : '🔐 Smart Contract Wallet (Not Deployed)') :
        '👤 Standard Wallet (EOA)';

    let message = `
💼 <b>Your Wallet</b>

📍 <b>Address:</b> <code>${fullAddress}</code>
🔗 <b>Short:</b> ${shortAddress}
🏷️ <b>Type:</b> ${walletType}

💰 <b>Balances:</b>
⚡ tCORE: ${formatBalance(ethBalance, 'tCORE')}
🪙 ${tokenSymbol}: ${formatBalance(tokenBalance, tokenSymbol)}

🌐 <b>Network:</b> Core Testnet
⛽ <b>Gas Token:</b> tCORE`;

    if (walletInfo.isSmartWallet) {
        message += `

🔧 <b>Account Abstraction Features:</b>
• Gasless transactions (when sponsored)
• Batch transactions
• Social recovery (future)
• Enhanced security`;

        if (walletInfo.signerAddress) {
            message += `

🔑 <b>Signer Address:</b> <code>${walletInfo.signerAddress}</code>`;
        }

        if (!walletInfo.isDeployed) {
            message += `

⚠️ <b>Note:</b> Smart wallet will be deployed on first transaction`;
        }
    }

    message += `

💡 <b>Tips:</b>
• Your wallet is automatically created and managed
• tCORE is needed for transaction fees
• Admins can send you ${tokenSymbol} rewards
• Smart wallets provide enhanced security

🔗 <b>Blockchain Explorer:</b>
View your transactions at: https://scan.test2.btcs.network/address/${fullAddress}`;

    return message;
}

/**
 * Handle wallet command
 * @param {Object} walletService - WalletService instance (fallback)
 * @param {Object} accountAbstractionService - AccountAbstractionService instance
 * @param {Object} userModel - UserModel instance
 */
export function createWalletCommand(walletService, accountAbstractionService, userModel) {
    return async (ctx) => {
        try {
            const userId = ctx.from.id.toString();

            // Use Account Abstraction service if available, otherwise fallback
            const service = accountAbstractionService || walletService;
            const walletInfo = await service.getUserWallet(userId);

            // Update user's wallet address in database (fixed method call)
            await userModel.updateUserWallet(userId, walletInfo.address);
            
            // Get balances
            const ethBalance = await service.getWalletBalance(walletInfo.address);
            
            let tokenBalance = '0';
            let tokenSymbol = 'mUSDT';
            
            if (process.env.USDT_CONTRACT_ADDRESS) {
                tokenBalance = await service.getWalletBalance(
                    walletInfo.address,
                    process.env.USDT_CONTRACT_ADDRESS
                );
            }
            
            // Create and send wallet message
            const message = createWalletMessage(walletInfo, ethBalance, tokenBalance, tokenSymbol);

            // Use plain text to avoid HTML parsing issues
            const plainMessage = message
                .replace(/<b>/g, '*')
                .replace(/<\/b>/g, '*')
                .replace(/<code>/g, '`')
                .replace(/<\/code>/g, '`')
                .replace(/<i>/g, '_')
                .replace(/<\/i>/g, '_');

            await ctx.reply(plainMessage, { parse_mode: 'Markdown' });
            
        } catch (error) {
            console.error('Error in wallet command:', error);
            await ctx.reply('❌ Sorry, I couldn\'t retrieve your wallet information right now. Please try again later.');
        }
    };
}

/**
 * Handle wallet funding command (admin only)
 * @param {Object} walletService - WalletService instance
 * @param {Object} userModel - UserModel instance
 * @param {Array} adminUserIds - Array of admin user IDs
 */
export function createFundWalletCommand(walletService, userModel, adminUserIds) {
    return async (ctx) => {
        try {
            const requesterId = ctx.from.id.toString();
            
            // Check if requester is admin
            if (!adminUserIds.includes(requesterId)) {
                return await ctx.reply('❌ This command is only available to administrators.');
            }

            const args = ctx.message.text.split(' ').slice(1);
            if (args.length < 2) {
                return await ctx.reply('Usage: /fund @username amount_eth\nExample: /fund @alice 0.01');
            }

            const target = args[0];
            const amount = args[1];

            // Validate amount
            const amountNum = parseFloat(amount);
            if (isNaN(amountNum) || amountNum <= 0) {
                return await ctx.reply('❌ Invalid amount. Please provide a positive number.');
            }

            // Find target user
            let targetUser = null;
            if (target.startsWith('@')) {
                const username = target.substring(1);
                targetUser = await userModel.getUserByUsername(username);
            } else if (/^\d+$/.test(target)) {
                targetUser = await userModel.getUserByTelegramId(target);
            }

            if (!targetUser) {
                return await ctx.reply('❌ User not found. Make sure they have interacted with the bot.');
            }

            // Get target user's wallet
            const targetWallet = await walletService.getUserWallet(targetUser.telegram_user_id);
            
            // This would require admin's private key to fund wallets
            // For now, just show the information needed
            await ctx.replyWithHTML(`
💰 <b>Wallet Funding Request</b>

👤 <b>Target User:</b> ${target}
📍 <b>Wallet Address:</b> <code>${targetWallet.address}</code>
💵 <b>Amount:</b> ${amount} tCORE

⚠️ <b>Manual Action Required:</b>
Please send ${amount} tCORE to the above address using your admin wallet.

🔗 <b>Core Testnet Faucet:</b>
Get test tCORE at: https://scan.test2.btcs.network/faucet

💡 <b>Note:</b> Users need tCORE for transaction fees when receiving tips.
            `);
            
        } catch (error) {
            console.error('Error in fund wallet command:', error);
            await ctx.reply('❌ Sorry, I couldn\'t process the funding request right now. Please try again later.');
        }
    };
}

/**
 * Handle balance check command (admin feature)
 * @param {Object} walletService - WalletService instance
 * @param {Object} userModel - UserModel instance
 * @param {Array} adminUserIds - Array of admin user IDs
 */
export function createBalanceCommand(walletService, userModel, adminUserIds) {
    return async (ctx) => {
        try {
            const requesterId = ctx.from.id.toString();
            
            // Check if requester is admin
            if (!adminUserIds.includes(requesterId)) {
                return await ctx.reply('❌ This command is only available to administrators.');
            }

            const args = ctx.message.text.split(' ').slice(1);
            if (args.length === 0) {
                return await ctx.reply('Usage: /balance @username or /balance user_id');
            }

            const target = args[0];
            let targetUser = null;

            if (target.startsWith('@')) {
                const username = target.substring(1);
                targetUser = await userModel.getUserByUsername(username);
            } else if (/^\d+$/.test(target)) {
                targetUser = await userModel.getUserByTelegramId(target);
            }

            if (!targetUser) {
                return await ctx.reply('❌ User not found. Make sure they have interacted with the bot.');
            }

            // Get wallet info and balances
            const walletInfo = await walletService.getUserWallet(targetUser.telegram_user_id);
            const ethBalance = await walletService.getWalletBalance(walletInfo.address);
            
            let tokenBalance = '0';
            if (process.env.USDT_CONTRACT_ADDRESS) {
                tokenBalance = await walletService.getWalletBalance(
                    walletInfo.address,
                    process.env.USDT_CONTRACT_ADDRESS
                );
            }

            await ctx.replyWithHTML(`
💼 <b>Wallet Balance Check</b>

👤 <b>User:</b> ${target}
📍 <b>Address:</b> <code>${walletInfo.address}</code>

💰 <b>Balances:</b>
⚡ tCORE: ${formatBalance(ethBalance, 'tCORE')}
🪙 mUSDT: ${formatBalance(tokenBalance, 'mUSDT')}

🔗 <b>Explorer:</b> https://scan.test2.btcs.network/address/${walletInfo.address}
            `);
            
        } catch (error) {
            console.error('Error in balance command:', error);
            await ctx.reply('❌ Sorry, I couldn\'t retrieve the balance right now. Please try again later.');
        }
    };
}
