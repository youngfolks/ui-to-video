#!/bin/bash
set -e

echo "🚀 UI-to-Video Deployment Script for Laravel Forge"
echo "=================================================="

# Navigate to project root
cd "$(dirname "$0")"

echo "📦 Installing backend dependencies..."
cd backend
npm install --production

echo "📁 Creating required directories..."
mkdir -p uploads/screenshots uploads/detections uploads/videos temp

echo "🎨 Building frontend..."
cd ../frontend
npm install
npm run build

echo "🎬 Installing renderer dependencies..."
cd ../renderer
npm install --production

echo "🔧 Installing Chromium dependencies..."
sudo apt-get update -qq
sudo apt-get install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
  libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
  libxrandr2 libgbm1 libasound2

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Configure .env file in backend/ directory"
echo "2. Start backend with: pm2 start backend/server.js --name ui-to-video-api --max-memory-restart 2G"
echo "3. Copy frontend build: cp -r frontend/dist/* /home/forge/yoursite/public_html/"
echo "4. Configure Nginx reverse proxy (see WEB_UI_README.md)"
