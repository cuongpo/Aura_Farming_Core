/**
 * Transfer commands implementation - ETH and USDT transfers between users
 */
import { ethers } from 'ethers';

/**
 * Format user display name
 * @param {Object} user - User data
 * @returns {string} Formatted display name
 */
function formatUserName(user) {
    if (user.username) {
        return `@${user.username}`;
    } else if (user.first_name && user.last_name) {
        return `${user.first_name} ${user.last_name}`;
    } else if (user.first_name) {
        return user.first_name;
    } else {
        return `User ${user.telegram_user_id}`;
    }
}

/**
 * Parse transfer command arguments
 * @param {string} text - Command text
 * @param {string} tokenType - 'ETH' or 'USDT'
 * @returns {Object} Parsed arguments
 */
function parseTransferArguments(text, tokenType = 'ETH') {
    const args = text.split(' ').slice(1);

    if (args.length < 2) {
        return {
            error: `Usage: /transfer_${tokenType.toLowerCase()} <wallet_address> <amount> [message]\nExample: /transfer_${tokenType.toLowerCase()} 0x1234...5678 ${tokenType === 'ETH' ? '0.01' : '100'} Optional message`
        };
    }

    const target = args[0];
    const amount = args[1];
    const message = args.slice(2).join(' ') || '';

    // Validate wallet address format
    if (!ethers.isAddress(target)) {
        return { error: 'Please provide a valid wallet address (0x...)' };
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
        return { error: 'Please provide a valid positive amount' };
    }

    return {
        target,
        amount: amountNum,
        message: message.trim()
    };
}

/**
 * Create transaction record in database
 * @param {Object} database - Database instance
 * @param {Object} transactionData - Transaction data
 * @returns {number} Transaction ID
 */
async function createTransferRecord(database, transactionData) {
    const result = await database.run(
        `INSERT INTO transactions
         (from_user_id, to_user_id, from_address, to_address, amount, token_address,
          tx_type, status, chat_group_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            transactionData.fromUserId,
            transactionData.toUserId || null, // May be null for external addresses
            transactionData.fromAddress,
            transactionData.toAddress,
            transactionData.amount.toString(),
            transactionData.tokenAddress || 'ETH',
            transactionData.txType,
            'pending',
            transactionData.chatGroupId
        ]
    );

    return result.id;
}

/**
 * Update transaction status
 * @param {Object} database - Database instance
 * @param {number} transactionId - Transaction ID
 * @param {string} status - New status
 * @param {string} txHash - Transaction hash (optional)
 */
async function updateTransferStatus(database, transactionId, status, txHash = null) {
    await database.run(
        'UPDATE transactions SET status = ?, tx_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, txHash, transactionId]
    );
}

/**
 * Handle tCORE transfer command
 * @param {Object} walletService - WalletService instance (fallback)
 * @param {Object} accountAbstractionService - AccountAbstractionService instance
 * @param {Object} userModel - UserModel instance
 * @param {Object} database - Database instance
 */
export function createTransferCoreCommand(walletService, accountAbstractionService, userModel, database) {
    return async (ctx) => {
        try {
            const senderId = ctx.from.id.toString();

            // Parse command arguments
            const parsed = parseTransferArguments(ctx.message.text, 'tCORE');
            if (parsed.error) {
                return await ctx.reply(`❌ ${parsed.error}`);
            }

            const { target, amount, message } = parsed;

            // Target is now a wallet address
            const targetAddress = target;

            // Use Account Abstraction service if available, otherwise fallback
            const service = accountAbstractionService || walletService;

            // Get sender wallet
            const senderWallet = await service.getUserWallet(senderId);

            // Check if trying to transfer to themselves
            if (targetAddress.toLowerCase() === senderWallet.signerAddress.toLowerCase()) {
                return await ctx.reply('❌ You cannot transfer to your own wallet address!');
            }

            // Update sender's wallet address in database
            await userModel.updateUserWallet(senderId, senderWallet.address);

            // Try to find if target address belongs to a known user (optional)
            let targetUser = null;
            try {
                const allUsers = await userModel.getAllUsers();
                for (const user of allUsers) {
                    if (user.wallet_address && user.wallet_address.toLowerCase() === targetAddress.toLowerCase()) {
                        targetUser = user;
                        break;
                    }
                }
            } catch (error) {
                console.log('Could not check for target user:', error.message);
            }

            // Get chat group ID if in group chat
            let chatGroupId = null;
            if (ctx.chatGroup) {
                chatGroupId = ctx.chatGroup.id;
            }

            // Get sender user record
            const senderUser = await userModel.getUserByTelegramId(senderId);

            // Create transaction record (skip for now to avoid constraint issues)
            let transactionId = null;
            try {
                transactionId = await createTransferRecord(database, {
                    fromUserId: senderUser.id,
                    toUserId: targetUser ? targetUser.id : null, // May be null for external addresses
                    fromAddress: senderWallet.signerAddress,
                    toAddress: targetAddress,
                    amount: amount,
                    tokenAddress: null, // ETH transfer
                    txType: 'transfer_eth',
                    chatGroupId: chatGroupId
                });
            } catch (dbError) {
                console.log('Could not create transaction record:', dbError.message);
                // Continue without transaction record for now
            }

            // Send initial confirmation
            const targetDisplay = targetUser ? formatUserName(targetUser) : `${targetAddress.substring(0, 6)}...${targetAddress.substring(targetAddress.length - 4)}`;
            const initialMessage = `
⚡ <b>Processing ETH Transfer</b>

👤 <b>From:</b> ${formatUserName(ctx.from)}
🎯 <b>To:</b> ${targetDisplay}
📍 <b>Address:</b> <code>${targetAddress}</code>
💵 <b>Amount:</b> ${amount} ETH
${message ? `💬 <b>Message:</b> ${message}` : ''}

⏳ <b>Status:</b> Processing transaction...
            `;

            const statusMessage = await ctx.replyWithHTML(initialMessage);

            try {
                // Check sender's ETH balance
                const senderBalance = await service.getWalletBalance(senderWallet.signerAddress);
                const senderBalanceNum = parseFloat(senderBalance);

                if (senderBalanceNum < amount) {
                    await updateTransferStatus(database, transactionId, 'failed');
                    
                    return await ctx.telegram.editMessageText(
                        ctx.chat.id,
                        statusMessage.message_id,
                        null,
                        `❌ <b>Transfer Failed</b>\n\nInsufficient ETH balance. You have ${senderBalance} ETH but tried to send ${amount} ETH.`,
                        { parse_mode: 'HTML' }
                    );
                }

                // Execute ETH transfer using the signer wallet directly
                const tx = await senderWallet.signer.sendTransaction({
                    to: targetAddress,
                    value: ethers.parseEther(amount.toString())
                });

                console.log(`⚡ ETH transfer initiated: ${tx.hash}`);
                const receipt = await tx.wait();

                // Update transaction status if record was created
                if (transactionId) {
                    await updateTransferStatus(database, transactionId, 'confirmed', tx.hash);
                }

                // Send success message
                const successMessage = `
✅ <b>ETH Transfer Successful!</b>

👤 <b>From:</b> ${formatUserName(ctx.from)}
🎯 <b>To:</b> ${targetDisplay}
📍 <b>Address:</b> <code>${targetAddress}</code>
💵 <b>Amount:</b> ${amount} ETH
${message ? `💬 <b>Message:</b> ${message}` : ''}

🔗 <b>Transaction:</b> <code>${tx.hash}</code>
⛽ <b>Gas Used:</b> ${receipt.gasUsed.toString()}

🎉 <b>Transfer completed successfully!</b>
                `;

                await ctx.telegram.editMessageText(
                    ctx.chat.id,
                    statusMessage.message_id,
                    null,
                    successMessage,
                    { parse_mode: 'HTML' }
                );

                // Send notification to target user if they're known and in group chat
                if (targetUser && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
                    try {
                        await ctx.telegram.sendMessage(
                            targetUser.telegram_user_id,
                            `🎉 You received ${amount} ETH from ${formatUserName(ctx.from)} in ${ctx.chat.title}!\n\nTransaction: ${tx.hash}`
                        );
                    } catch (dmError) {
                        console.log('Could not send DM to user:', dmError.message);
                    }
                }

            } catch (error) {
                console.error('Error processing ETH transfer:', error);

                if (transactionId) {
                    await updateTransferStatus(database, transactionId, 'failed');
                }

                await ctx.telegram.editMessageText(
                    ctx.chat.id,
                    statusMessage.message_id,
                    null,
                    `❌ <b>Transfer Failed</b>\n\nError: ${error.message}`,
                    { parse_mode: 'HTML' }
                );
            }

        } catch (error) {
            console.error('Error in transfer ETH command:', error);
            await ctx.reply('❌ Sorry, I couldn\'t process the transfer right now. Please try again later.');
        }
    };
}

/**
 * Handle USDT transfer command
 * @param {Object} walletService - WalletService instance (fallback)
 * @param {Object} accountAbstractionService - AccountAbstractionService instance
 * @param {Object} userModel - UserModel instance
 * @param {Object} database - Database instance
 */
export function createTransferUSDTCommand(walletService, accountAbstractionService, userModel, database) {
    return async (ctx) => {
        try {
            const senderId = ctx.from.id.toString();
            
            // Check if USDT contract is configured
            if (!process.env.USDT_CONTRACT_ADDRESS) {
                return await ctx.reply('❌ USDT contract not configured. Please contact administrators.');
            }

            // Parse command arguments
            const parsed = parseTransferArguments(ctx.message.text, 'USDT');
            if (parsed.error) {
                return await ctx.reply(`❌ ${parsed.error}`);
            }

            const { target, amount, message } = parsed;

            // Validate amount limits
            if (amount > 10000) {
                return await ctx.reply('❌ Maximum transfer amount is 10,000 mUSDT');
            }

            // Target is now a wallet address
            const targetAddress = target;

            // Check if trying to transfer to themselves
            const service = accountAbstractionService || walletService;
            const senderWallet = await service.getUserWallet(senderId);

            if (targetAddress.toLowerCase() === senderWallet.signerAddress.toLowerCase()) {
                return await ctx.reply('❌ You cannot transfer to your own wallet address!');
            }

            // Send initial confirmation
            const targetDisplay = `${targetAddress.substring(0, 6)}...${targetAddress.substring(targetAddress.length - 4)}`;
            const initialMessage = `
🪙 <b>Processing mUSDT Transfer</b>

👤 <b>From:</b> ${formatUserName(ctx.from)}
🎯 <b>To:</b> ${targetDisplay}
📍 <b>Address:</b> <code>${targetAddress}</code>
💵 <b>Amount:</b> ${amount} mUSDT
${message ? `💬 <b>Message:</b> ${message}` : ''}

⏳ <b>Status:</b> Processing transaction...
            `;

            const statusMessage = await ctx.replyWithHTML(initialMessage);

            try {
                // Execute USDT transfer using direct token contract interaction
                const tokenContract = new ethers.Contract(
                    process.env.USDT_CONTRACT_ADDRESS,
                    [
                        'function transfer(address to, uint256 value) returns (bool)',
                        'function decimals() view returns (uint8)',
                        'function balanceOf(address) view returns (uint256)'
                    ],
                    senderWallet.signer
                );

                // Get token decimals and convert amount
                const decimals = await tokenContract.decimals();
                const amountWei = ethers.parseUnits(amount.toString(), decimals);

                // Check sender's balance
                const senderBalance = await tokenContract.balanceOf(senderWallet.signerAddress);
                if (senderBalance < amountWei) {
                    return await ctx.telegram.editMessageText(
                        ctx.chat.id,
                        statusMessage.message_id,
                        null,
                        `❌ <b>Transfer Failed</b>\n\nInsufficient mUSDT balance. You have ${ethers.formatUnits(senderBalance, decimals)} mUSDT but tried to send ${amount} mUSDT.`,
                        { parse_mode: 'HTML' }
                    );
                }

                // Execute the transfer
                const tx = await tokenContract.transfer(targetAddress, amountWei);
                console.log(`🪙 mUSDT transfer initiated: ${tx.hash}`);

                const receipt = await tx.wait();
                console.log(`✅ mUSDT transfer successful: ${tx.hash}`);

                // Send success message
                const successMessage = `
✅ <b>mUSDT Transfer Successful!</b>

👤 <b>From:</b> ${formatUserName(ctx.from)}
🎯 <b>To:</b> ${targetDisplay}
📍 <b>Address:</b> <code>${targetAddress}</code>
💵 <b>Amount:</b> ${amount} mUSDT
${message ? `💬 <b>Message:</b> ${message}` : ''}

🔗 <b>Transaction:</b> <code>${tx.hash}</code>
⛽ <b>Gas Used:</b> ${receipt.gasUsed.toString()}

🎉 <b>Transfer completed successfully!</b>
                `;

                await ctx.telegram.editMessageText(
                    ctx.chat.id,
                    statusMessage.message_id,
                    null,
                    successMessage,
                    { parse_mode: 'HTML' }
                );

            } catch (error) {
                console.error('Error processing mUSDT transfer:', error);

                await ctx.telegram.editMessageText(
                    ctx.chat.id,
                    statusMessage.message_id,
                    null,
                    `❌ <b>Transfer Failed</b>\n\nError: ${error.message}`,
                    { parse_mode: 'HTML' }
                );
            }

        } catch (error) {
            console.error('Error in transfer USDT command:', error);
            await ctx.reply('❌ Sorry, I couldn\'t process the transfer right now. Please try again later.');
        }
    };
}
