import { ethers } from 'ethers';
import crypto from 'crypto';

/**
 * AccountAbstractionService - Handles ERC-4337 smart contract wallets
 * Creates deterministic smart contract wallets for users using account abstraction
 */
class AccountAbstractionService {
    constructor(provider, entryPointAddress, factoryAddress) {
        this.provider = provider;
        this.entryPointAddress = entryPointAddress;
        this.factoryAddress = factoryAddress;
        this.wallets = new Map(); // Cache for created wallets
        
        // ABI for SimpleAccountFactory
        this.factoryABI = [
            "function createAccount(address owner, uint256 salt) returns (address)",
            "function getAddress(address owner, uint256 salt) view returns (address)"
        ];
        
        // ABI for SimpleAccount
        this.accountABI = [
            "function owner() view returns (address)",
            "function execute(address dest, uint256 value, bytes calldata func)",
            "function executeBatch(address[] calldata dest, bytes[] calldata func)",
            "function getDeposit() view returns (uint256)",
            "function addDeposit() payable",
            "function withdrawDepositTo(address payable withdrawAddress, uint256 amount)"
        ];
        
        // Initialize factory contract
        if (this.factoryAddress) {
            this.factoryContract = new ethers.Contract(
                this.factoryAddress, 
                this.factoryABI, 
                this.provider
            );
        }
    }

    /**
     * Generate deterministic EOA (signer) for a user
     * @param {string} telegramUserId - The user's Telegram ID
     * @returns {Object} EOA wallet object
     */
    generateUserSigner(telegramUserId) {
        // Create a deterministic seed from the user ID
        const seed = crypto.createHash('sha256')
            .update(`aura-farming-signer-${telegramUserId}`)
            .digest('hex');
        
        // Create EOA wallet from the seed (this will be the signer/owner)
        const signerWallet = new ethers.Wallet(seed, this.provider);
        
        return signerWallet;
    }

    /**
     * Calculate smart contract wallet address for a user
     * @param {string} telegramUserId - The user's Telegram ID
     * @returns {string} Smart contract wallet address
     */
    async calculateSmartWalletAddress(telegramUserId) {
        if (!this.factoryContract) {
            throw new Error('Factory contract not initialized. Deploy contracts first.');
        }

        const signer = this.generateUserSigner(telegramUserId);
        const salt = this.generateSalt(telegramUserId);
        
        // Calculate the smart contract wallet address
        const smartWalletAddress = await this.factoryContract.getAddress(signer.address, salt);
        
        return smartWalletAddress;
    }

    /**
     * Generate deterministic salt for CREATE2
     * @param {string} telegramUserId - The user's Telegram ID
     * @returns {string} Salt for CREATE2
     */
    generateSalt(telegramUserId) {
        const saltHash = crypto.createHash('sha256')
            .update(`aura-farming-salt-${telegramUserId}`)
            .digest('hex');
        
        return ethers.toBigInt('0x' + saltHash);
    }

    /**
     * Get or create smart contract wallet for a user
     * @param {string} telegramUserId - The user's Telegram ID
     * @returns {Object} Wallet information with smart contract address
     */
    async getUserWallet(telegramUserId) {
        // Check cache first
        if (this.wallets.has(telegramUserId)) {
            return this.wallets.get(telegramUserId);
        }

        const signer = this.generateUserSigner(telegramUserId);
        const salt = this.generateSalt(telegramUserId);
        
        let smartWalletAddress;
        
        if (this.factoryContract) {
            // Calculate smart contract wallet address
            smartWalletAddress = await this.calculateSmartWalletAddress(telegramUserId);
        } else {
            // Fallback to EOA if no factory deployed
            console.warn('No factory contract deployed, using EOA wallet');
            smartWalletAddress = signer.address;
        }

        const walletInfo = {
            address: signer.address, // Use EOA address for now to ensure uniqueness
            signerAddress: signer.address,
            signerPrivateKey: signer.privateKey,
            signer: signer,
            salt: salt.toString(),
            isSmartWallet: false, // Temporarily disable smart wallets due to factory bug
            isDeployed: true, // EOA is always "deployed"
            smartWalletAddress: smartWalletAddress // Keep for future reference
        };

        // Check if smart contract wallet is already deployed
        if (this.factoryContract) {
            const code = await this.provider.getCode(smartWalletAddress);
            walletInfo.isDeployed = code !== '0x';
        }

        // Cache the wallet info
        this.wallets.set(telegramUserId, walletInfo);
        
        return walletInfo;
    }

    /**
     * Deploy smart contract wallet for a user
     * @param {string} telegramUserId - The user's Telegram ID
     * @param {ethers.Wallet} deployerWallet - Wallet to pay for deployment
     * @returns {Object} Deployment result
     */
    async deployUserWallet(telegramUserId, deployerWallet) {
        if (!this.factoryContract) {
            throw new Error('Factory contract not initialized');
        }

        const walletInfo = await this.getUserWallet(telegramUserId);
        
        if (walletInfo.isDeployed) {
            return {
                success: true,
                address: walletInfo.address,
                txHash: null,
                message: 'Wallet already deployed'
            };
        }

        try {
            const factoryWithSigner = this.factoryContract.connect(deployerWallet);
            
            const tx = await factoryWithSigner.createAccount(
                walletInfo.signerAddress,
                walletInfo.salt
            );
            
            const receipt = await tx.wait();
            
            // Update cache
            walletInfo.isDeployed = true;
            this.wallets.set(telegramUserId, walletInfo);
            
            return {
                success: true,
                address: walletInfo.address,
                txHash: receipt.hash,
                gasUsed: receipt.gasUsed.toString(),
                message: 'Smart contract wallet deployed successfully'
            };
            
        } catch (error) {
            console.error('Error deploying smart contract wallet:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get wallet balance (works for both EOA and smart contract wallets)
     * @param {string} walletAddress - The wallet address
     * @param {string} tokenAddress - The token contract address (optional)
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
     * Execute transaction through smart contract wallet
     * @param {string} telegramUserId - User's Telegram ID
     * @param {string} to - Target address
     * @param {string} value - ETH value to send
     * @param {string} data - Transaction data
     * @returns {Object} Transaction result
     */
    async executeTransaction(telegramUserId, to, value = '0', data = '0x') {
        const walletInfo = await this.getUserWallet(telegramUserId);
        
        if (!walletInfo.isSmartWallet) {
            throw new Error('Not a smart contract wallet');
        }
        
        if (!walletInfo.isDeployed) {
            throw new Error('Smart contract wallet not deployed yet');
        }

        try {
            const smartWalletContract = new ethers.Contract(
                walletInfo.address,
                this.accountABI,
                walletInfo.signer
            );
            
            const valueWei = ethers.parseEther(value);
            
            const tx = await smartWalletContract.execute(to, valueWei, data);
            const receipt = await tx.wait();
            
            return {
                success: true,
                txHash: receipt.hash,
                gasUsed: receipt.gasUsed.toString()
            };
            
        } catch (error) {
            console.error('Error executing transaction:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Transfer tokens using smart contract wallet or EOA fallback
     * @param {string} fromUserId - Sender's Telegram user ID
     * @param {string} toUserId - Recipient's Telegram user ID
     * @param {string} amount - Amount to transfer
     * @param {string} tokenAddress - Token contract address
     * @returns {Object} Transaction result
     */
    async transferTokens(fromUserId, toUserId, amount, tokenAddress) {
        try {
            const senderWallet = await this.getUserWallet(fromUserId);
            const recipientWallet = await this.getUserWallet(toUserId);

            console.log(`💸 Transfer: ${amount} tokens from ${senderWallet.address} to ${recipientWallet.address}`);
            console.log(`📊 Sender wallet - Smart: ${senderWallet.isSmartWallet}, Deployed: ${senderWallet.isDeployed}`);
            console.log(`📊 Recipient wallet - Smart: ${recipientWallet.isSmartWallet}, Deployed: ${recipientWallet.isDeployed}`);

            // Get token contract interface
            const tokenContract = new ethers.Contract(
                tokenAddress,
                [
                    'function transfer(address to, uint256 value) returns (bool)',
                    'function decimals() view returns (uint8)',
                    'function balanceOf(address) view returns (uint256)'
                ],
                this.provider
            );

            // Get token decimals and convert amount
            const decimals = await tokenContract.decimals();
            const amountWei = ethers.parseUnits(amount, decimals);

            // For now, use EOA-to-EOA transfer to avoid smart contract deployment complexity
            // This is a practical approach for the bot's current needs
            console.log('🔄 Using EOA-to-EOA transfer for reliability');

            // Check sender's balance (use signer address for actual token balance)
            const senderBalance = await tokenContract.balanceOf(senderWallet.signerAddress);
            console.log(`💰 Sender balance: ${ethers.formatUnits(senderBalance, decimals)} tokens`);

            if (senderBalance < amountWei) {
                throw new Error(`Insufficient balance. Has: ${ethers.formatUnits(senderBalance, decimals)}, Needs: ${amount}`);
            }

            // Execute transfer from sender's EOA to recipient's EOA
            const tokenWithSigner = tokenContract.connect(senderWallet.signer);
            const tx = await tokenWithSigner.transfer(recipientWallet.signerAddress, amountWei);
            const receipt = await tx.wait();

            console.log(`✅ Transfer successful: ${receipt.hash}`);

            return {
                success: true,
                txHash: receipt.hash,
                from: senderWallet.signerAddress,
                to: recipientWallet.signerAddress,
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
}

export default AccountAbstractionService;
