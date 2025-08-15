# Deployment Guide

This guide walks you through deploying the Aura Farming Telegram Bot step by step.

## Prerequisites

1. **Node.js 18+** installed on your system
2. **Telegram Bot Token** from [@BotFather](https://t.me/BotFather)
3. **Wallet with Core Testnet tCORE** for contract deployment
4. **Server or VPS** for hosting the bot (optional, can run locally)

## Step 1: Create Telegram Bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` command
3. Choose a name and username for your bot
4. Save the bot token (you'll need it later)
5. Configure bot settings:
   ```
   /setcommands
   
   start - Get started with the bot
   help - Show help message
   leaderboard - View weekly top 10 users
   ranking - Check your current rank
   wallet - View wallet info and balance
   tip - Send USDT rewards (admin only)
   ```

## Step 2: Get Your Admin User ID

1. Message [@userinfobot](https://t.me/userinfobot) on Telegram
2. It will reply with your user ID
3. Save this number - you'll need it for admin configuration

## Step 3: Set Up Development Environment

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd aura-farming
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables:**
   ```env
   # Telegram Configuration
   TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
   
   # Core Testnet Configuration
   CORE_TESTNET_RPC_URL=https://rpc.test2.btcs.network
   CORE_TESTNET_CHAIN_ID=1114
   
   # Your private key (for contract deployment)
   PRIVATE_KEY=0x1234567890abcdef...
   
   # Database
   DATABASE_PATH=./data/bot.db
   
   # Admin Configuration (your Telegram user ID)
   ADMIN_USER_IDS=123456789
   ```

## Step 4: Get Testnet tCORE

1. **Visit Core Testnet Faucet:**
   ```bash
   open https://scan.test2.btcs.network/faucet
   ```

2. **Enter your wallet address** (the one corresponding to your private key)
3. **Request testnet tCORE** - you'll need at least 0.01 tCORE for deployment
4. **Wait for confirmation** - usually takes 1-2 minutes

## Step 5: Deploy Smart Contract

1. **Compile the contract:**
   ```bash
   npm run compile
   ```

2. **Deploy to Core testnet:**
   ```bash
   npm run deploy-all-core
   ```

3. **Verify deployment:**
   - Check that contract addresses were added to your `.env` file
   - Visit [Core Testnet Explorer](https://scan.test2.btcs.network/) to verify the contracts

## Step 6: Test the Bot Locally

1. **Start the bot:**
   ```bash
   npm run dev
   ```

2. **Test basic functionality:**
   - Send `/start` to your bot in a private message
   - Add the bot to a test group
   - Send some messages in the group
   - Try `/leaderboard` and `/ranking` commands

3. **Test admin functionality:**
   - Try `/wallet` to see your wallet address
   - Use `/tip @username 10` to test tipping (you'll need mUSDT tokens)

## Step 7: Mint Test Tokens (Admin Only)

To test the tipping functionality, you need to mint some mUSDT tokens:

1. **Using Remix IDE:**
   - Go to [Remix](https://remix.ethereum.org/)
   - Create a new file with the MockUSDT contract code
   - Compile and connect to Core testnet
   - Use the `mint` function to create tokens for your admin wallet

2. **Using Hardhat Console:**
   ```bash
   npx hardhat console --network coreTestnet
   ```
   ```javascript
   const MockUSDT = await ethers.getContractFactory("MockUSDT");
   const contract = MockUSDT.attach("YOUR_CONTRACT_ADDRESS");
   await contract.mint("YOUR_ADMIN_WALLET_ADDRESS", ethers.parseUnits("1000", 6));
   ```

## Step 8: Production Deployment

### Option A: VPS/Server Deployment

1. **Set up your server:**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 for process management
   sudo npm install -g pm2
   ```

2. **Deploy your code:**
   ```bash
   # Clone repository
   git clone <your-repo-url>
   cd aura-farming
   
   # Install dependencies
   npm install --production
   
   # Copy your .env file
   scp .env user@your-server:/path/to/aura-farming/
   ```

3. **Start with PM2:**
   ```bash
   # Start the bot
   pm2 start src/index.js --name "aura-farming-bot"
   
   # Save PM2 configuration
   pm2 save
   pm2 startup
   ```

### Option B: Docker Deployment

1. **Create Dockerfile:**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install --production
   COPY . .
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Build and run:**
   ```bash
   docker build -t aura-farming-bot .
   docker run -d --name aura-farming-bot --env-file .env aura-farming-bot
   ```

## Step 9: Monitoring and Maintenance

1. **Check logs:**
   ```bash
   # PM2 logs
   pm2 logs aura-farming-bot
   
   # Docker logs
   docker logs aura-farming-bot
   ```

2. **Monitor database:**
   ```bash
   # Check database size
   ls -lh data/bot.db
   
   # Backup database
   cp data/bot.db data/bot.db.backup.$(date +%Y%m%d)
   ```

3. **Update the bot:**
   ```bash
   git pull origin main
   npm install
   pm2 restart aura-farming-bot
   ```

## Troubleshooting

### Common Issues

1. **Bot not responding:**
   - Check bot token is correct
   - Verify bot has necessary permissions in groups
   - Check server logs for errors

2. **Contract deployment fails:**
   - Ensure you have enough testnet ETH
   - Check private key format (should start with 0x)
   - Verify RPC URL is accessible

3. **Database errors:**
   - Check file permissions on data directory
   - Ensure SQLite is properly installed
   - Verify database path in .env

4. **Tipping not working:**
   - Ensure contract is deployed and address is in .env
   - Check admin has mUSDT tokens
   - Verify recipient has interacted with bot

### Getting Help

- Check the logs first: `pm2 logs` or `docker logs`
- Verify all environment variables are set correctly
- Test individual components using the test suite: `npm test`
- Check the GitHub issues for similar problems

## Security Considerations

1. **Keep private keys secure** - never commit them to version control
2. **Use environment variables** for all sensitive configuration
3. **Regularly backup your database** to prevent data loss
4. **Monitor for unusual activity** in bot usage
5. **Keep dependencies updated** to patch security vulnerabilities

## Next Steps

Once deployed successfully:

1. **Add the bot to your community groups**
2. **Announce the bot to your users**
3. **Set up regular token rewards** for active users
4. **Monitor usage and adjust parameters** as needed
5. **Consider implementing additional features** based on user feedback
