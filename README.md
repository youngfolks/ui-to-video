# UI-to-Video Animation Platform

Transform UI screenshots and websites into animated 3D videos with just a few clicks.

## 🎯 What is This?

A complete web application that:
1. Takes a screenshot or URL as input
2. Automatically detects UI layers using Puppeteer
3. Lets you visually select which layers to animate
4. Provides 5 animation types (pop-out, rotate-360, fade-in, slide-in, scale-pop)
5. Renders a professional 3D video using Remotion + Three.js

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js 18+
- Git

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd ui-to-video

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install renderer dependencies
cd renderer
npm install
cd ..
```

### Running Locally

**Terminal 1 - Backend API:**
```bash
cd backend
npm run dev
# Server runs on http://localhost:3002
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# App runs on http://localhost:5174
```

**Terminal 3 - Remotion Studio (optional):**
```bash
cd renderer
npm run dev
# Studio runs on http://localhost:3000
```

### Usage

1. Open http://localhost:5174
2. Enter a URL (e.g., https://insomniacookies.com/products/candy-cane) or upload an image
3. Click "Analyze Layers"
4. Select layers by clicking on them
5. Choose animation types for each layer
6. Preview and render your video

## 📦 Production Deployment

See [WEB_UI_README.md](WEB_UI_README.md) for complete deployment instructions for Laravel Forge, DigitalOcean, AWS Lambda, and more.

### Quick Deploy to Laravel Forge

1. Push to Git repository
2. Create new site in Forge
3. SSH into server and run:

```bash
cd /home/forge/yoursite
git pull

# Backend
cd backend
npm install --production
mkdir -p uploads/screenshots uploads/detections uploads/videos temp
pm2 start server.js --name ui-to-video-api --max-memory-restart 2G
pm2 save

# Frontend
cd ../frontend
npm install
npm run build
cp -r dist/* /home/forge/yoursite/public_html/

# Renderer
cd ../renderer
npm install --production
```

4. Configure Nginx reverse proxy (see WEB_UI_README.md)

## 📁 Project Structure

```
ui-to-video/
├── backend/          # Express API (Node.js)
├── frontend/         # React SPA (Vite)
├── renderer/         # Remotion video renderer
├── detect-url.js     # Puppeteer detection script
└── WEB_UI_README.md  # Complete documentation
```

## ⚠️ Known Limitations

### macOS Rendering Issue

Video rendering **does not work on macOS** due to a WebGL context error in headless Chromium. 

**Workarounds:**
- Use Remotion Studio for local testing (`cd renderer && npm run dev`)
- Deploy to Linux for production (Ubuntu, AWS Lambda, Docker)

See [WEB_UI_README.md#known-limitations](WEB_UI_README.md#known-limitations) for details.

## 🎨 Features

- ✅ Upload screenshots or enter URLs
- ✅ Automatic layer detection via Puppeteer
- ✅ Visual layer selection with SVG overlays
- ✅ 5 animation types (pop-out, rotate-360, fade-in, slide-in, scale-pop)
- ✅ Mobile/desktop viewport support
- ✅ Render queue (prevents server overload)
- ✅ Real-time preview (Remotion Player)
- ✅ Download MP4 videos

## 📝 Documentation

- [WEB_UI_README.md](WEB_UI_README.md) - Complete web UI documentation
- [backend/README.md](backend/README.md) - Backend API reference
- [frontend/README.md](frontend/README.md) - Frontend development guide
- [renderer/README.md](renderer/README.md) - Remotion renderer details

## 🔧 Tech Stack

- **Frontend**: React 18, Vite, Remotion Player
- **Backend**: Express, Multer, Puppeteer
- **Renderer**: Remotion 4, Three.js, React Three Fiber
- **Deployment**: PM2, Nginx, Laravel Forge

## 📄 License

MIT

## 🤝 Contributing

Pull requests welcome! Please read the documentation first.

## 💬 Support

For issues and questions, see [WEB_UI_README.md](WEB_UI_README.md) Troubleshooting section.
