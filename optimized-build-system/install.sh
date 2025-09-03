#!/bin/bash

# Semantic Build Optimizer Installation Script
# This script sets up the optimizer for use with any React project

set -e

echo "🚀 Semantic Build Optimizer Installation"
echo "========================================"
echo ""

# Check Node.js version
echo "🔍 Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16.0.0 or higher."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="16.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js 16.0.0 or higher."
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION is compatible"

# Check npm
echo "🔍 Checking npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ npm is available"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x scripts/*.js

echo "✅ Scripts are now executable"

# Run demo
echo "🎬 Running demo optimization..."
node scripts/demo-optimization.js

if [ $? -eq 0 ]; then
    echo "✅ Demo completed successfully"
else
    echo "⚠️  Demo had issues, but installation is complete"
fi

echo ""
echo "🎉 Installation Complete!"
echo "========================"
echo ""
echo "📋 Quick Start:"
echo "1. Build your React app: npm run build"
echo "2. Run optimization: npm run optimize"
echo "3. Deploy optimized files"
echo ""
echo "📚 Documentation:"
echo "- README.md - Complete guide"
echo "- docs/SETUP_GUIDE.md - Detailed setup instructions"
echo ""
echo "🔧 Available Commands:"
echo "- npm run optimize - Run optimization with auto-detection"
echo "- npm run optimize:max - Use Maximum Aggression strategy"
echo "- npm run optimize:enhanced - Use Enhanced strategy"
echo "- npm run demo - Run demo optimization"
echo ""
echo "💡 For help: node scripts/universal-optimizer.js --help"
echo ""
echo "🚀 Ready to optimize your React app!"
