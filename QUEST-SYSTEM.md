# 🎮 Quest System - Daily Chests & AURA Rewards

The Aura Farming Bot now includes a gamified Quest System that rewards users with AURA tokens for daily engagement!

## 🌟 **How It Works**

### **Daily Quest:**
- **Objective**: Send at least 1 message in any group chat per day
- **Reward**: Unlock daily chest
- **Reset**: Every day at midnight

### **Daily Chest:**
- **Unlock Condition**: Complete daily quest
- **Reward**: Random 0-5 AURA tokens
- **Claiming**: User pays gas fees to claim AURA tokens

## 🎯 **User Commands**

### **Quest Commands:**
```
/quest          - View daily quest status and chest availability
/openchest      - Open today's chest (if eligible)
/claimaura      - Claim AURA tokens from opened chest
/questhistory   - View last 7 days of quest progress
```

### **Example Flow:**
1. User sends message in group chat → Quest completed ✅
2. User runs `/quest` → Sees chest is available 🎁
3. User runs `/openchest` → Gets random 0-5 AURA reward 🪙
4. User runs `/claimaura` → AURA tokens sent to wallet 💰

## 🪙 **AURA Token**

### **Token Details:**
- **Name**: Aura Token
- **Symbol**: AURA
- **Decimals**: 18
- **Network**: Core Testnet
- **Use Case**: Quest rewards and future features

### **Reward Distribution:**
- **Daily Chest**: 0-5 AURA (random)
- **Future Quests**: Additional AURA rewards
- **Special Events**: Bonus AURA opportunities

## 🏗️ **Technical Implementation**

### **Database Tables:**

**daily_quests:**
- Tracks daily quest completion
- Links to user activity

**daily_chests:**
- Manages chest eligibility and rewards
- Stores transaction hashes

**quest_activity:**
- Records user messages per day
- Enables quest completion tracking

### **Smart Contracts:**

**AuraToken.sol:**
- ERC-20 token with minting capabilities
- Quest-specific mint functions
- Event logging for rewards

## 🚀 **Deployment Guide**

### **1. Deploy AURA Token:**
```bash
npm run deploy-aura
```

### **2. Update Environment:**
```bash
# Add to .env
AURA_TOKEN_CONTRACT_ADDRESS=0x_your_deployed_address
```

### **3. Test Quest System:**
```bash
# In Telegram:
/quest          # Check status
/openchest      # Open chest
/claimaura      # Claim rewards
```

## 📊 **Quest Statistics**

### **User Stats Tracked:**
- Total quests completed
- Total AURA earned
- Daily completion streak
- Chest opening history

### **Admin Monitoring:**
- Daily active users
- AURA distribution
- Quest completion rates
- User engagement metrics

## 🎨 **User Experience**

### **Quest Status Display:**
```
🎮 Daily Quest - 8/14/2025

✅ Daily Quest Completed!
📝 Messages sent today: 5

🎁 Daily Chest Available!
💰 Reward: 0-5 AURA tokens (random)
🔓 Use /openchest to open your daily chest
```

### **Chest Opening Animation:**
```
🎁 Opening your daily chest...
✨ Chest opened! ✨
🎉 You won 3 AURA tokens!
💰 Use /claimaura to claim your AURA tokens
```

## 🔧 **Configuration Options**

### **Customizable Settings:**
- Daily quest requirements
- Chest reward ranges
- Quest reset timing
- Token distribution rates

### **Future Enhancements:**
- Weekly quests
- Special event chests
- AURA staking rewards
- NFT quest rewards

## 🎯 **Gamification Features**

### **Engagement Mechanics:**
- **Daily Habits**: Encourage daily participation
- **Random Rewards**: Excitement from chest opening
- **Progress Tracking**: Visual quest completion
- **Achievement System**: Future milestone rewards

### **Social Features:**
- **Leaderboards**: Top AURA earners
- **Group Challenges**: Collective quest goals
- **Sharing**: Quest completion announcements

## 🛡️ **Security & Fairness**

### **Anti-Gaming Measures:**
- One quest per user per day
- Group chat requirement (no DM farming)
- Transaction-based reward claiming
- Activity validation

### **Smart Contract Security:**
- Owner-only minting
- Event logging for transparency
- Proper access controls
- Gas-efficient operations

## 📈 **Analytics & Insights**

### **Trackable Metrics:**
- Daily active users
- Quest completion rates
- AURA distribution patterns
- User retention impact

### **Success Indicators:**
- Increased daily engagement
- Higher group chat activity
- User retention improvement
- Community growth

## 🎉 **Benefits**

### **For Users:**
- **Daily Rewards**: Free AURA tokens
- **Gamification**: Fun quest system
- **Engagement**: Reason to participate daily
- **Ownership**: Real crypto rewards

### **For Communities:**
- **Activity Boost**: More daily messages
- **User Retention**: Daily return incentive
- **Growth**: Attractive reward system
- **Engagement**: Gamified participation

---

**The Quest System transforms passive chat participation into an engaging, rewarding experience that benefits both users and communities! 🚀**
