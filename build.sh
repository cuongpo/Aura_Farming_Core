#!/bin/bash

echo "🚀 Building Aura Farming Bot for Production..."

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install

# Install frontend dependencies
echo "📦 Installing React dependencies..."
cd frontend
npm install

# Build React app
echo "🔨 Building React app..."
npm run build

# Go back to root
cd ..

echo "✅ Build complete! Ready for production."
