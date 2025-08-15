import { ethers } from 'ethers';
import crypto from 'crypto';

/**
 * WalletService handles account abstraction wallet creation and management
 * For simplicity, we'll use a deterministic wallet generation approach
 * In production, you'd want to use proper account abstraction libraries
 */
class WalletService {
    constructor(provider, entryPointAddress) {
        this.provider = provider;
        this.entryPointAddress = entryPointAddress;
        this.wallets = new Map(); // Cache for created wallets
    }

    /**
     * Generate a deterministic wallet for a user based on their Telegram ID
     * @param {string} telegramUserId - The user's Telegram ID
     * @returns {Object} Wallet object with address and private key
     */
    generateUserWallet(telegramUserId) {
        // Create a deterministic seed from the user ID
        const seed = crypto.createHash('sha256')
            .update(`aura-farming-bot-${telegramUserId}`)
            .digest('hex');
        
        // Create wallet from the seed
        const wallet = new ethers.Wallet(seed, this.provider);
        
        return {
            address: wallet.address,
            privateKey: wallet.privateKey,
            wallet: wallet
        };
    }

    /**
     * Get or create a wallet for a user
     * @param {string} telegramUserId - The user's Telegram ID
     * @returns {Object} Wallet information
     */
    async getUserWallet(telegramUserId) {
        // Check cache first
        if (this.wallets.has(telegramUserId)) {
            return this.wallets.get(telegramUserId);
        }

        // Generate new wallet
        const walletInfo = this.generateUserWallet(telegramUserId);
        
        // Cache the wallet
        this.wallets.set(telegramUserId, walletInfo);
        
        return walletInfo;
    }

    /**
     * Get wallet balance for a specific token
     * @param {string} walletAddress - The wallet address
     * @param {string} tokenAddress - The token contract address (optional, defaults to ETH)
     * @returns {string} Balance in human-readable format
     */
    async getWalletBalance(walletAddress, tokenAddress = null) {
        try {
            if (!tokenAddress) {
                // Get ETH balance
                const balance = await this.provider.getBalance(walletAddress);
                return ethers.formatEther(balance);
            } else {
                // Get token balance
                const tokenContract = new ethers.Contract(
                    tokenAddress,
                    [
                        'function balanceOf(address) view returns (uint256)',
                        'function decimals() view returns (uint8)'
                    ],
                    this.provider
                );
                
                const balance = await tokenContract.balanceOf(walletAddress);
                const decimals = await tokenContract.decimals();
                
                return ethers.formatUnits(balance, decimals);
            }
        } catch (error) {
            console.error('Error getting wallet balance:', error);
            return '0';
        }
    }

    /**
     * Transfer tokens from one wallet to another
     * @param {string} fromUserId - Sender's Telegram user ID
     * @param {string} toAddress - Recipient's wallet address
     * @param {string} amount - Amount to transfer
     * @param {string} tokenAddress - Token contract address
     * @returns {Object} Transaction result
     */
    async transferTokens(fromUserId, toAddress, amount, tokenAddress) {
        try {
            const senderWallet = await this.getUserWallet(fromUserId);
            
            // Create token contract instance
            const tokenContract = new ethers.Contract(
                tokenAddress,
                [
                    'function transfer(address to, uint256 value) returns (bool)',
                    'function decimals() view returns (uint8)',
                    'function balanceOf(address) view returns (uint256)'
                ],
                senderWallet.wallet
            );
            
            // Get token decimals
            const decimals = await tokenContract.decimals();
            const amountWei = ethers.parseUnits(amount, decimals);
            
            // Check balance
            const balance = await tokenContract.balanceOf(senderWallet.address);
            if (balance < amountWei) {
                throw new Error('Insufficient balance');
            }
            
            // Execute transfer
            const tx = await tokenContract.transfer(toAddress, amountWei);
            const receipt = await tx.wait();
            
            return {
                success: true,
                txHash: receipt.hash,
                from: senderWallet.address,
                to: toAddress,
                amount: amount,
                gasUsed: receipt.gasUsed.toString()
            };
            
        } catch (error) {
            console.error('Error transferring tokens:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Fund a wallet with ETH for gas fees
     * @param {string} toAddress - Address to fund
     * @param {string} amount - Amount of ETH to send
     * @param {ethers.Wallet} funderWallet - Wallet to fund from
     * @returns {Object} Transaction result
     */
    async fundWalletWithETH(toAddress, amount, funderWallet) {
        try {
            const amountWei = ethers.parseEther(amount);
            
            const tx = await funderWallet.sendTransaction({
                to: toAddress,
                value: amountWei
            });
            
            const receipt = await tx.wait();
            
            return {
                success: true,
                txHash: receipt.hash,
                amount: amount,
                gasUsed: receipt.gasUsed.toString()
            };
            
        } catch (error) {
            console.error('Error funding wallet:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get transaction history for a wallet (simplified version)
     * @param {string} walletAddress - Wallet address
     * @param {number} limit - Number of transactions to fetch
     * @returns {Array} Transaction history
     */
    async getTransactionHistory(walletAddress, limit = 10) {
        try {
            // This is a simplified implementation
            // In production, you'd want to use a proper indexing service
            const latestBlock = await this.provider.getBlockNumber();
            const transactions = [];
            
            // Look through recent blocks for transactions involving this address
            for (let i = 0; i < Math.min(100, latestBlock) && transactions.length < limit; i++) {
                const blockNumber = latestBlock - i;
                const block = await this.provider.getBlock(blockNumber, true);
                
                if (block && block.transactions) {
                    for (const tx of block.transactions) {
                        if (tx.from === walletAddress || tx.to === walletAddress) {
                            transactions.push({
                                hash: tx.hash,
                                from: tx.from,
                                to: tx.to,
                                value: ethers.formatEther(tx.value || 0),
                                blockNumber: blockNumber,
                                timestamp: block.timestamp
                            });
                            
                            if (transactions.length >= limit) break;
                        }
                    }
                }
            }
            
            return transactions;
            
        } catch (error) {
            console.error('Error getting transaction history:', error);
            return [];
        }
    }
}

export default WalletService;
