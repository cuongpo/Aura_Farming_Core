import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { ethers } from 'ethers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Web server for Telegram Web App
 */
class WebServer {
    constructor(accountAbstractionService, userModel, database, botToken) {
        this.app = express();
        this.accountAbstractionService = accountAbstractionService;
        this.userModel = userModel;
        this.database = database;
        this.botToken = botToken;
        this.port = process.env.PORT || process.env.WEB_PORT || 3000;
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        // Parse JSON bodies
        this.app.use(express.json());
        
        // Serve static files from React build
        this.app.use(express.static(path.join(__dirname, '..', 'frontend', 'build')));
        
        // CORS for development
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Telegram-Init-Data');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            next();
        });
    }

    setupRoutes() {
        // Serve the React app
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '..', 'frontend', 'build', 'index.html'));
        });

        // API Routes
        this.app.get('/api/wallet/:userId', this.handleGetWallet.bind(this));
        this.app.post('/api/transfer', this.handleTransfer.bind(this));

        // Quest API routes
        this.app.get('/api/quest/:userId', this.handleGetQuest.bind(this));
        this.app.post('/api/open-chest/:userId', this.handleOpenChest.bind(this));
        this.app.post('/api/claim-aura/:userId', this.handleClaimAura.bind(this));
        this.app.get('/api/quest-history/:userId', this.handleGetQuestHistory.bind(this));
        this.app.get('/api/aura-balance/:userId', this.handleGetAuraBalance.bind(this));
        
        // Health check for Render
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                service: 'aura-farming-bot',
                environment: process.env.NODE_ENV || 'development'
            });
        });

        // Root endpoint for Render health checks
        this.app.get('/', (req, res) => {
            res.json({
                message: 'Aura Farming Bot API',
                status: 'running',
                timestamp: new Date().toISOString(),
                webApp: 'https://t.me/your_bot_name/app'
            });
        });
    }

    /**
     * Validate Telegram Web App data
     */
    validateTelegramData(initData) {
        if (!initData) return null;

        try {
            const urlParams = new URLSearchParams(initData);
            const hash = urlParams.get('hash');
            urlParams.delete('hash');

            // Create data check string
            const dataCheckArr = [];
            for (const [key, value] of urlParams.entries()) {
                dataCheckArr.push(`${key}=${value}`);
            }
            dataCheckArr.sort();
            const dataCheckString = dataCheckArr.join('\n');

            // Create secret key
            const secretKey = crypto.createHmac('sha256', 'WebAppData').update(this.botToken).digest();
            
            // Calculate hash
            const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

            if (calculatedHash === hash) {
                // Parse user data
                const userParam = urlParams.get('user');
                if (userParam) {
                    return JSON.parse(userParam);
                }
            }
        } catch (error) {
            console.error('Error validating Telegram data:', error);
        }

        return null;
    }

    /**
     * Handle get wallet info request
     */
    async handleGetWallet(req, res) {
        try {
            const { userId } = req.params;
            const initData = req.headers['x-telegram-init-data'] || req.query.initData;

            console.log('Wallet request for user:', userId);
            console.log('Init data present:', !!initData);

            // Validate Telegram data (temporarily disabled for debugging)
            // TODO: Re-enable after fixing Telegram Web App integration
            if (false && process.env.NODE_ENV === 'production') {
                const telegramUser = this.validateTelegramData(initData);
                if (!telegramUser || telegramUser.id.toString() !== userId) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
            }

            // Get user wallet info
            const walletInfo = await this.accountAbstractionService.getUserWallet(userId);
            
            // Get balances (use same address as Telegram command)
            const coreBalance = await this.accountAbstractionService.getWalletBalance(walletInfo.address);
            const usdtBalance = await this.accountAbstractionService.getWalletBalance(
                walletInfo.address,
                process.env.USDT_CONTRACT_ADDRESS
            );

            // Get user info from database
            let userInfo = null;
            try {
                userInfo = await this.userModel.getUserByTelegramId(userId);
            } catch (error) {
                console.log('User not found in database, creating...');
                // User might not exist in database yet
            }

            res.json({
                success: true,
                address: walletInfo.address,
                balances: {
                    core: parseFloat(coreBalance).toFixed(6),
                    usdt: parseFloat(usdtBalance).toFixed(3),
                    aura: '0.000' // Will be updated when AURA service is integrated
                },
                walletType: walletInfo.isSmartWallet ? 'Smart Contract' : 'EOA',
                isDeployed: walletInfo.isDeployed,
                user: userInfo
            });

        } catch (error) {
            console.error('Error getting wallet info:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to get wallet information' 
            });
        }
    }

    /**
     * Handle transfer request
     */
    async handleTransfer(req, res) {
        try {
            const { userId, token, toAddress, amount, message } = req.body;
            const initData = req.headers['x-telegram-init-data'];

            console.log('Transfer request for user:', userId);
            console.log('Transfer details:', { token, toAddress, amount });

            // Validate Telegram data (temporarily disabled for debugging)
            // TODO: Re-enable after fixing Telegram Web App integration
            if (false && process.env.NODE_ENV === 'production') {
                const telegramUser = this.validateTelegramData(initData);
                if (!telegramUser || telegramUser.id.toString() !== userId) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
            }

            // Validate inputs
            if (!toAddress || !amount || !token) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Missing required fields' 
                });
            }

            // Validate address format
            if (!toAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Invalid address format' 
                });
            }

            // Validate amount
            const amountNum = parseFloat(amount);
            if (isNaN(amountNum) || amountNum <= 0) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Invalid amount' 
                });
            }

            let transferResult;

            if (token === 'CORE') {
                // tCORE transfer
                const senderWallet = await this.accountAbstractionService.getUserWallet(userId);

                // Check balance
                const coreBalance = await this.accountAbstractionService.getWalletBalance(senderWallet.signerAddress);
                if (parseFloat(coreBalance) < amountNum) {
                    return res.status(400).json({
                        success: false,
                        error: `Insufficient tCORE balance. You have ${coreBalance} tCORE`
                    });
                }

                // Execute tCORE transfer
                const tx = await senderWallet.signer.sendTransaction({
                    to: toAddress,
                    value: ethers.parseEther(amount.toString())
                });

                const receipt = await tx.wait();

                transferResult = {
                    success: true,
                    txHash: tx.hash,
                    gasUsed: receipt.gasUsed.toString()
                };

            } else if (token === 'USDT') {
                // USDT transfer
                const senderWallet = await this.accountAbstractionService.getUserWallet(userId);

                const tokenContract = new ethers.Contract(
                    process.env.USDT_CONTRACT_ADDRESS,
                    [
                        'function transfer(address to, uint256 value) returns (bool)',
                        'function decimals() view returns (uint8)',
                        'function balanceOf(address) view returns (uint256)'
                    ],
                    senderWallet.signer
                );

                // Check balance
                const decimals = await tokenContract.decimals();
                const amountWei = ethers.parseUnits(amount.toString(), decimals);
                const balance = await tokenContract.balanceOf(senderWallet.signerAddress);

                if (balance < amountWei) {
                    return res.status(400).json({
                        success: false,
                        error: `Insufficient mUSDT balance. You have ${ethers.formatUnits(balance, decimals)} mUSDT`
                    });
                }

                const tx = await tokenContract.transfer(toAddress, amountWei);
                const receipt = await tx.wait();

                transferResult = {
                    success: true,
                    txHash: tx.hash,
                    gasUsed: receipt.gasUsed.toString()
                };
            } else {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Unsupported token' 
                });
            }

            if (transferResult.success) {
                res.json({
                    success: true,
                    txHash: transferResult.txHash,
                    gasUsed: transferResult.gasUsed,
                    message: `Successfully sent ${amount} ${token} to ${toAddress}`
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: transferResult.error || 'Transfer failed'
                });
            }

        } catch (error) {
            console.error('Error processing transfer:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Transfer failed: ' + error.message 
            });
        }
    }

    /**
     * Start the web server
     */
    start() {
        return new Promise((resolve) => {
            this.server = this.app.listen(this.port, () => {
                console.log(`🌐 Web App server running on port ${this.port}`);
                console.log(`📱 Telegram Web App URL: http://localhost:${this.port}`);
                resolve();
            });
        });
    }

    /**
     * Stop the web server
     */
    stop() {
        if (this.server) {
            this.server.close();
        }
    }

    /**
     * Handle get quest status
     */
    async handleGetQuest(req, res) {
        try {
            const { userId } = req.params;
            console.log('Quest status request for user:', userId);

            // Get quest status from database
            const questStatus = await this.database.get(`
                SELECT
                    dq.completed,
                    dq.completed_at,
                    dc.eligible,
                    dc.opened,
                    dc.reward_amount,
                    dc.transaction_hash,
                    COALESCE(qa.message_count, 0) as message_count
                FROM (
                    SELECT ? as user_id, date('now') as quest_date
                ) u
                LEFT JOIN daily_quests dq ON u.user_id = dq.user_id AND u.quest_date = dq.quest_date
                LEFT JOIN daily_chests dc ON u.user_id = dc.user_id AND u.quest_date = dc.chest_date
                LEFT JOIN (
                    SELECT user_id, SUM(message_count) as message_count
                    FROM quest_activity
                    WHERE user_id = ? AND activity_date = date('now')
                    GROUP BY user_id
                ) qa ON u.user_id = qa.user_id
            `, [userId, userId]);

            const questData = {
                date: new Date().toISOString().split('T')[0],
                quest: {
                    completed: questStatus?.completed || false,
                    completed_at: questStatus?.completed_at
                },
                chest: {
                    eligible: questStatus?.eligible || false,
                    opened: questStatus?.opened || false,
                    reward_amount: questStatus?.reward_amount || 0,
                    transaction_hash: questStatus?.transaction_hash
                },
                messageCount: questStatus?.message_count || 0
            };

            res.json(questData);

        } catch (error) {
            console.error('Error getting quest status:', error);
            res.status(500).json({ error: 'Failed to get quest status' });
        }
    }

    /**
     * Handle open chest
     */
    async handleOpenChest(req, res) {
        try {
            const { userId } = req.params;
            console.log('Open chest request for user:', userId);

            const today = new Date().toISOString().split('T')[0];

            // Check if user is eligible and hasn't opened chest yet
            const chest = await this.database.get(`
                SELECT * FROM daily_chests
                WHERE user_id = ? AND chest_date = ? AND eligible = 1 AND opened = 0
            `, [userId, today]);

            if (!chest) {
                return res.status(400).json({ error: 'Not eligible or already opened' });
            }

            // Generate random reward (0-5 AURA tokens)
            const rewardAmount = Math.floor(Math.random() * 6); // 0 to 5

            // Mark chest as opened
            await this.database.run(`
                UPDATE daily_chests
                SET opened = 1, reward_amount = ?, opened_at = datetime('now')
                WHERE user_id = ? AND chest_date = ?
            `, [rewardAmount, userId, today]);

            res.json({
                success: true,
                reward: rewardAmount,
                date: today
            });

        } catch (error) {
            console.error('Error opening chest:', error);
            res.status(500).json({ error: 'Failed to open chest' });
        }
    }

    /**
     * Handle claim AURA - simplified for now
     */
    async handleClaimAura(req, res) {
        try {
            const { userId } = req.params;
            console.log('Claim AURA request for user:', userId);

            // For now, return success (AURA integration will be completed later)
            res.json({
                success: true,
                message: 'AURA claiming will be available once AURA service is fully integrated'
            });

        } catch (error) {
            console.error('Error claiming AURA:', error);
            res.status(500).json({ error: 'Failed to claim AURA' });
        }
    }

    /**
     * Handle get quest history
     */
    async handleGetQuestHistory(req, res) {
        try {
            const { userId } = req.params;
            console.log('Quest history request for user:', userId);

            const history = await this.database.all(`
                SELECT
                    dq.quest_date,
                    dq.completed,
                    dq.completed_at,
                    dc.opened,
                    dc.reward_amount,
                    dc.opened_at,
                    dc.transaction_hash
                FROM daily_quests dq
                LEFT JOIN daily_chests dc ON dq.user_id = dc.user_id AND dq.quest_date = dc.chest_date
                WHERE dq.user_id = ?
                ORDER BY dq.quest_date DESC
                LIMIT 7
            `, [userId]);

            res.json(history || []);

        } catch (error) {
            console.error('Error getting quest history:', error);
            res.status(500).json({ error: 'Failed to get quest history' });
        }
    }

    /**
     * Handle get AURA balance
     */
    async handleGetAuraBalance(req, res) {
        try {
            const { userId } = req.params;
            console.log('AURA balance request for user:', userId);

            // For now, return 0 balance (will be implemented with AURA service)
            res.json({ balance: '0.000' });

        } catch (error) {
            console.error('Error getting AURA balance:', error);
            res.status(500).json({ error: 'Failed to get AURA balance' });
        }
    }
}

export default WebServer;
