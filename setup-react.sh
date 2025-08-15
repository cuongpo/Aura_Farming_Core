#!/bin/bash

echo "🚀 Setting up React Frontend for Aura Farming Bot..."

# Install frontend dependencies
echo "📦 Installing React dependencies..."
cd frontend
npm install

# Build the React app
echo "🔨 Building React app..."
npm run build

# Go back to root
cd ..

echo "✅ React frontend setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Add AURA token address to .env:"
echo "   AURA_TOKEN_CONTRACT_ADDRESS=0xD82C0Cd4A00Ef6bAA4CfA54748EA22EC132db73f"
echo ""
echo "2. Start the bot:"
echo "   npm start"
echo ""
echo "3. Open the web app in Telegram to see the new React UI!"
echo ""
echo "🎨 Features:"
echo "- Modern Material-UI design"
echo "- Smooth animations with Framer Motion"
echo "- 3 separate tabs: Wallet, Transfer, Quest"
echo "- Mobile-responsive design"
echo "- Real-time quest tracking"
echo "- Interactive chest opening"
echo "- Professional user experience"
