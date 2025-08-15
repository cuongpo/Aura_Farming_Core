# 🚀 Render Deployment Guide

Deploy your Aura Farming Bot (Telegram Bot + Web App) to Render with HTTPS support.

## 🌟 **What This Deployment Includes**

✅ **Telegram Bot** - Full bot functionality with commands  
✅ **Web App Server** - HTTPS web interface for Telegram Web App  
✅ **Database** - SQLite database for user data  
✅ **Smart Contracts** - ERC-4337 Account Abstraction  
✅ **Real-time Processing** - Live transaction handling  

## 🚀 **Step-by-Step Deployment**

### 1. **Push Latest Changes to GitHub**

```bash
git add .
git commit -m "Add Render deployment configuration"
git push origin main
```

### 2. **Deploy to Render**

1. **Go to Render Dashboard:**
   - Visit: https://render.com
   - Sign up/Login with GitHub

2. **Create New Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository: `cuongpo/aura_farming`
   - Select the repository

3. **Configure Deployment:**
   - **Name:** `aura-farming-bot`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (sufficient for testing)

### 3. **Set Environment Variables**

In Render dashboard, add these environment variables:

**Required Variables:**
```
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
PRIVATE_KEY=your_wallet_private_key
ADMIN_USER_IDS=your_telegram_user_id
USDT_CONTRACT_ADDRESS=your_usdt_contract_address
SIMPLE_ACCOUNT_FACTORY_ADDRESS=your_factory_contract_address
```

**Pre-configured Variables:**
```
NODE_ENV=production
WEB_PORT=10000
CORE_TESTNET_RPC_URL=https://rpc.test2.btcs.network
ENTRY_POINT_ADDRESS=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
```

**Important:** After deployment, add:
```
WEB_APP_URL=https://your-app-name.onrender.com
```

### 4. **Get Your Environment Variables**

From your local `.env` file, copy these values:

```bash
# View your current values (be careful not to share these!)
cat .env | grep -E "(TELEGRAM_BOT_TOKEN|PRIVATE_KEY|ADMIN_USER_IDS|MOCK_USDT_CONTRACT_ADDRESS|SIMPLE_ACCOUNT_FACTORY_ADDRESS)"
```

### 5. **Deploy and Configure**

1. **Initial Deploy:**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Note your app URL: `https://your-app-name.onrender.com`

2. **Add Web App URL:**
   - Go to Environment tab in Render
   - Add: `WEB_APP_URL=https://your-app-name.onrender.com`
   - This will trigger a redeploy

3. **Verify Deployment:**
   - Check logs for "✅ Bot initialization completed"
   - Check logs for "🌐 Web App server running on port 10000"
   - Visit your URL to see the web app

## 🧪 **Testing Your Deployment**

### 1. **Test Bot Commands:**
```
/start          # Should show "Open Wallet App" button
/wallet         # Should show wallet info
/leaderboard    # Should show rankings
```

### 2. **Test Web App:**
- Click "🚀 Open Wallet App" button in Telegram
- Should open beautiful web interface
- Should show your wallet address and balances
- Should allow transfers

### 3. **Test Transfers:**
```
/transfer_usdt 0x... 10    # Should work
/transfer_eth 0x... 0.001  # Should work
```

## 🔧 **Render Configuration Details**

### **Automatic Features:**
- ✅ **HTTPS Certificate** - Automatic SSL
- ✅ **Custom Domain** - Optional custom domain support
- ✅ **Auto-Deploy** - Deploys on git push
- ✅ **Health Checks** - Automatic monitoring
- ✅ **Logs** - Real-time log viewing

### **Resource Limits (Free Plan):**
- **RAM:** 512 MB
- **CPU:** Shared
- **Bandwidth:** 100 GB/month
- **Build Time:** 15 minutes max
- **Sleep:** After 15 minutes of inactivity

### **Keeping Service Awake:**
Free services sleep after 15 minutes. To keep active:
1. Use a monitoring service (UptimeRobot)
2. Upgrade to paid plan ($7/month)
3. Accept occasional cold starts

## 🌟 **Post-Deployment**

### **Your Live URLs:**
- **Bot:** Running on Render (invisible to users)
- **Web App:** `https://your-app-name.onrender.com`
- **API:** `https://your-app-name.onrender.com/api/`

### **Features Now Available:**
- ✅ **Telegram Web App** - Full HTTPS support
- ✅ **Menu Button** - Persistent wallet access
- ✅ **Mobile Responsive** - Works on all devices
- ✅ **Real-time Updates** - Live balance and transactions
- ✅ **Secure API** - Telegram user authentication

## 🔒 **Security Notes**

- ✅ **Environment Variables** - Securely stored in Render
- ✅ **HTTPS Only** - All traffic encrypted
- ✅ **No Local Storage** - No sensitive data in code
- ✅ **Telegram Auth** - User verification via Telegram

## 🎯 **Troubleshooting**

### **Common Issues:**

1. **Bot Not Responding:**
   - Check environment variables
   - Verify bot token is correct
   - Check Render logs

2. **Web App Not Loading:**
   - Verify WEB_APP_URL is set
   - Check if URL starts with https://
   - Verify port configuration

3. **Transfers Failing:**
   - Check private key is correct
   - Verify contract addresses
   - Ensure wallet has ETH for gas

### **Checking Logs:**
```
# In Render dashboard:
1. Go to your service
2. Click "Logs" tab
3. Look for error messages
```

## 🎉 **Success!**

Your Aura Farming Bot is now live with:
- ✅ **24/7 Telegram Bot** 
- ✅ **HTTPS Web App**
- ✅ **Full DeFi Functionality**
- ✅ **Professional Deployment**

**Share your bot with users and enjoy your complete DeFi application! 🚀**
