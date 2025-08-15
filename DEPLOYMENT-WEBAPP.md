# 🚀 Web App Deployment Guide

Your Aura Farming Bot has a beautiful web interface that needs HTTPS to work with Telegram. Here are several deployment options:

## 🌟 **Current Status**

✅ **Bot Core Features Working:**
- Transfer commands (`/transfer_eth`, `/transfer_usdt`)
- Wallet management (`/wallet`)
- Activity tracking (`/leaderboard`)
- Admin tipping (`/tip`)

✅ **Web App Ready:**
- Server running on localhost:3000
- Beautiful UI with Telegram theme
- API endpoints for wallet operations
- Security validation implemented

⚠️ **HTTPS Required:**
- Telegram Web Apps require HTTPS URLs
- Localhost URLs are rejected by Telegram
- Need production deployment for full functionality

## 🚀 **Quick Deployment Options**

### Option 1: Vercel (Recommended - Free)

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Deploy:**
```bash
vercel --prod
```

3. **Update Environment:**
```bash
# Update .env with your Vercel URL
WEB_APP_URL=https://your-app.vercel.app
```

4. **Enable Web App Button:**
```javascript
// In src/index.js, uncomment the web app button code
// Replace localhost URL with your Vercel URL
```

### Option 2: Railway (Free Tier)

1. **Connect GitHub repo to Railway**
2. **Deploy automatically**
3. **Get HTTPS URL**
4. **Update WEB_APP_URL in environment**

### Option 3: Render (Free)

1. **Connect GitHub repo**
2. **Deploy as web service**
3. **Use provided HTTPS URL**

### Option 4: Ngrok (Development/Testing)

1. **Install ngrok:**
```bash
npm install -g ngrok
```

2. **Start tunnel:**
```bash
# In another terminal
ngrok http 3000
```

3. **Use HTTPS URL provided by ngrok**

## 🔧 **Configuration Steps**

### 1. Update Environment Variables

```env
# .env
WEB_APP_URL=https://your-domain.com
WEB_PORT=3000
NODE_ENV=production
```

### 2. Enable Web App Buttons

In `src/index.js`, uncomment and update:

```javascript
// Enable web app button in start command
{
    text: '🚀 Open Wallet App',
    web_app: { url: process.env.WEB_APP_URL }
}

// Enable menu button
await this.bot.telegram.setChatMenuButton({
    menu_button: {
        type: 'web_app',
        text: '🚀 Open Wallet',
        web_app: { url: process.env.WEB_APP_URL }
    }
});
```

### 3. Production Security

Update `src/webserver.js`:

```javascript
// Enable Telegram data validation in production
if (process.env.NODE_ENV === 'production') {
    const telegramUser = this.validateTelegramData(initData);
    if (!telegramUser || telegramUser.id.toString() !== userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}
```

## 📱 **Web App Features**

Once deployed with HTTPS, users will have access to:

### 🎨 **Beautiful Interface**
- Native Telegram theme integration
- Responsive mobile design
- User profile with avatar and handle
- Real-time balance updates

### 💰 **Wallet Operations**
- View ETH and mUSDT balances
- Copy wallet address with one click
- Send transfers to any Ethereum address
- Real-time transaction feedback

### 🔒 **Security Features**
- Telegram user authentication
- Address validation
- Balance checking
- Secure API endpoints

## 🧪 **Testing Checklist**

After deployment:

- [ ] Web app loads with HTTPS URL
- [ ] User profile displays correctly
- [ ] Wallet address and balances show
- [ ] Copy address function works
- [ ] ETH transfers work
- [ ] mUSDT transfers work
- [ ] Error handling works
- [ ] Success feedback displays

## 🌟 **Production Ready Features**

Your bot includes:

✅ **Complete Transfer System** - Chat commands + Web interface
✅ **Account Abstraction** - ERC-4337 smart wallets
✅ **Activity Tracking** - Leaderboards and rankings
✅ **Admin Tools** - Tipping and user management
✅ **Modern UI** - Professional web interface
✅ **Security** - Telegram authentication
✅ **Scalability** - Database with proper indexing

## 🎉 **Next Steps**

1. **Choose deployment platform** (Vercel recommended)
2. **Deploy with HTTPS**
3. **Update environment variables**
4. **Enable web app buttons**
5. **Test all functionality**
6. **Launch to users!**

Your Aura Farming Bot is a complete DeFi application ready for production! 🚀

## 📞 **Support**

For deployment help:
- Check platform documentation
- Test with ngrok first
- Verify HTTPS certificate
- Monitor server logs

**Your bot combines the best of both worlds: powerful chat commands and a beautiful web interface!**
