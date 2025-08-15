# 🌟 Aura Farming Bot

A Telegram bot with Account Abstraction wallets and token rewards on **Core blockchain testnet**.

## 🚀 Features

- **Smart Contract Wallets**: Account Abstraction (ERC-4337) for enhanced security
- **Token Rewards**: Earn AURA tokens and USDT through quests and activities
- **Gasless Transactions**: Smart wallets with sponsored transactions
- **Web Interface**: React-based web app for wallet management
- **Quest System**: Daily, weekly, and special quests with rewards
- **Social Features**: Tip other users, transfer tokens

## 🌐 Network Information

**Core Blockchain Testnet**
- **Chain ID**: 1114 (0x45a)
- **RPC URL**: https://rpc.test2.btcs.network
- **Explorer**: https://scan.test2.btcs.network/
- **Faucet**: https://scan.test2.btcs.network/faucet

## 📄 Deployed Contracts

### Token Contracts
| Contract | Address | Explorer |
|----------|---------|----------|
| **AURA Token** | `0xa694d8E2Ca3A54b0914683b1Aa25F80ab0768479` | [View](https://scan.test2.btcs.network/address/0xa694d8E2Ca3A54b0914683b1Aa25F80ab0768479) |
| **Mock USDT** | `0x9c7c5d8EfB173a60ED31D26bdfbB8770a01abb3E` | [View](https://scan.test2.btcs.network/address/0x9c7c5d8EfB173a60ED31D26bdfbB8770a01abb3E) |

### Account Abstraction Contracts
| Contract | Address | Explorer |
|----------|---------|----------|
| **EntryPoint** | `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789` | [View](https://scan.test2.btcs.network/address/0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789) |
| **SimpleAccountFactory** | `0x515626dda97E8E0D211791E350eC19be7408F10D` | [View](https://scan.test2.btcs.network/address/0x515626dda97E8E0D211791E350eC19be7408F10D) |

## 🛠️ Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Telegram Bot Token (from @BotFather)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd aura_farming_core_dao
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the bot**
   ```bash
   npm start
   ```

## ⚙️ Configuration

Create a `.env` file with the following variables:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Core Testnet Configuration
PRIVATE_KEY=your_private_key_here
CORE_TESTNET_RPC_URL=https://rpc.test2.btcs.network

# Deployed Contract Addresses (Core Testnet)
AURA_TOKEN_CONTRACT_ADDRESS=0xa694d8E2Ca3A54b0914683b1Aa25F80ab0768479
USDT_CONTRACT_ADDRESS=0x9c7c5d8EfB173a60ED31D26bdfbB8770a01abb3E
ENTRY_POINT_ADDRESS=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
SIMPLE_ACCOUNT_FACTORY_ADDRESS=0x515626dda97E8E0D211791E350eC19be7408F10D

# Database
DATABASE_PATH=./data/bot.db

# Bot Settings
BOT_ADMIN_WALLET=your_admin_wallet_address
NETWORK=coreTestnet
```

## 🎮 Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Initialize your account and get welcome message |
| `/wallet` | View your smart wallet address and balances |
| `/balance` | Check your token balances |
| `/quest` | View available quests and rewards |
| `/tip @user amount` | Send USDT to another user |
| `/transfer @user amount` | Transfer tokens between wallets |
| `/help` | Show all available commands |

## 💰 Token Information

### AURA Token
- **Symbol**: AURA
- **Decimals**: 18
- **Use**: Quest rewards, governance (future)
- **Initial Supply**: 1,000,000 AURA

### Mock USDT
- **Symbol**: mUSDT
- **Decimals**: 6
- **Use**: Tips, transfers, rewards
- **Mintable**: Yes (for testing)

## 🏗️ Development

### Available Scripts

```bash
# Start the bot
npm start

# Deploy contracts to Core testnet
npm run deploy-all-core
npm run deploy-aura-core
npm run deploy-usdt-core
npm run deploy-aa-core

# Development
npm run dev
npm test

# Frontend
npm run setup-frontend
npm run build-frontend
npm run dev-frontend
```

### Project Structure

```
├── contracts/           # Smart contracts
├── scripts/            # Deployment scripts
├── src/
│   ├── commands/       # Bot commands
│   ├── services/       # Blockchain services
│   ├── models/         # Database models
│   └── middleware/     # Bot middleware
├── frontend/           # React web app
├── data/              # Database and deployment info
└── tests/             # Test files
```

## 🔧 Smart Wallet Features

Users automatically get smart contract wallets with:

- **Enhanced Security**: Multi-signature capabilities
- **Gasless Transactions**: Sponsored by the bot (when configured)
- **Batch Operations**: Multiple transactions in one
- **Social Recovery**: Future feature for account recovery
- **Upgradeable**: Can add new features over time

## 🌐 Web Interface

Access the web interface at `http://localhost:3000` when running locally.

Features:
- Wallet overview
- Token balances
- Transaction history
- Quest management
- Settings

## 📊 Monitoring

The bot includes:
- Activity tracking
- Transaction logging
- Error handling
- Performance metrics
- Database management

## 🔒 Security

- Private keys are securely managed
- Smart contracts are audited
- Rate limiting on commands
- Input validation
- Error handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: Create an issue on GitHub
- **Documentation**: Check the `/docs` folder
- **Community**: Join our Telegram group

## 🔗 Links

- **Core DAO**: https://coredao.org/
- **Core Testnet Explorer**: https://scan.test2.btcs.network/
- **Core Testnet Faucet**: https://scan.test2.btcs.network/faucet
- **Account Abstraction**: https://eips.ethereum.org/EIPS/eip-4337

---

**Built with ❤️ for the Core blockchain ecosystem**