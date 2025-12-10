# Deployment Guide for Laravel Forge

## Pre-Deployment Checklist

- [ ] GitHub/GitLab repository created
- [ ] Laravel Forge account ready
- [ ] Server provisioned (Ubuntu 24.04, 2+ vCPUs, 4GB+ RAM)
- [ ] Domain name pointed to server (optional)

## Step 1: Push to Git

```bash
# Add your remote repository
git remote add origin <your-repo-url>

# Push to main branch
git push -u origin main
```

## Step 2: Create Site in Laravel Forge

1. Go to https://forge.laravel.com
2. Select your server
3. Click "New Site"
4. Enter domain name (e.g., `ui-to-video.yourdomain.com`)
5. Project Type: "Static HTML"
6. Web Directory: `/public_html`

## Step 3: Connect Git Repository

1. In Forge, go to your site
2. Click "Git Repository" tab
3. Select provider (GitHub/GitLab)
4. Enter repository: `your-username/ui-to-video`
5. Branch: `main`
6. Check "Install Composer Dependencies" - UNCHECK THIS (we use npm, not composer)
7. Click "Install Repository"

## Step 4: Deploy via SSH

SSH into your Forge server:

```bash
ssh forge@your-server-ip
cd /home/forge/ui-to-video.yourdomain.com
```

Run the deployment script:

```bash
chmod +x deploy-forge.sh
./deploy-forge.sh
```

## Step 5: Configure Environment

Create backend `.env` file:

```bash
cd backend
cp .env.example .env
nano .env
```

Update these values:

```env
PORT=3002
NODE_ENV=production
UPLOAD_DIR=/home/forge/ui-to-video.yourdomain.com/backend/uploads
CORS_ORIGIN=https://ui-to-video.yourdomain.com
```

## Step 6: Start Backend with PM2

```bash
cd /home/forge/ui-to-video.yourdomain.com/backend

# Start backend
pm2 start server.js --name ui-to-video-api --max-memory-restart 2G

# Save PM2 process list
pm2 save

# Enable PM2 startup on reboot
pm2 startup
# Run the command it outputs
```

## Step 7: Build and Deploy Frontend

```bash
cd /home/forge/ui-to-video.yourdomain.com/frontend

# Update API URL in src/api.js (if using different domain)
# nano src/api.js
# Change: const API_BASE_URL = 'https://ui-to-video.yourdomain.com/api';

# Build frontend
npm run build

# Copy to web root
cp -r dist/* /home/forge/ui-to-video.yourdomain.com/public_html/
```

## Step 8: Configure Nginx

In Laravel Forge panel:

1. Go to your site → "Edit Files" → "Edit Nginx Configuration"
2. Add this **inside the `server` block**, before the `location /` block:

```nginx
# Reverse proxy for backend API
location /api {
    proxy_pass http://localhost:3002;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    client_max_body_size 20M;
}
```

3. Click "Save"
4. Nginx will automatically reload

## Step 9: Enable SSL (Optional but Recommended)

In Forge:

1. Go to your site → SSL
2. Click "LetsEncrypt"
3. Enable SSL certificate
4. Wait for activation

## Step 10: Test Deployment

Visit your site:

```
https://ui-to-video.yourdomain.com
```

Test the workflow:
1. Enter URL: `https://insomniacookies.com/products/candy-cane`
2. Click "Analyze Layers"
3. Select 2-3 layers
4. Assign animations
5. Render video

## Monitoring & Maintenance

### View Backend Logs

```bash
pm2 logs ui-to-video-api
```

### Monitor Resources

```bash
pm2 monit
```

### Restart Backend

```bash
pm2 restart ui-to-video-api
```

### Update Deployment

```bash
cd /home/forge/ui-to-video.yourdomain.com
git pull origin main
cd backend && npm install --production
pm2 restart ui-to-video-api
cd ../frontend && npm run build
cp -r dist/* /home/forge/ui-to-video.yourdomain.com/public_html/
```

## Troubleshooting

### Backend won't start

```bash
# Check logs
pm2 logs ui-to-video-api --lines 50

# Verify .env file exists
ls -la /home/forge/ui-to-video.yourdomain.com/backend/.env

# Check port 3002 is not in use
sudo lsof -i :3002
```

### Render fails

```bash
# Verify Chromium dependencies
cd /home/forge/ui-to-video.yourdomain.com/renderer
npm run check-chrome

# Check renderer logs
pm2 logs ui-to-video-api | grep -i render
```

### 502 Bad Gateway

```bash
# Verify backend is running
pm2 list

# Check Nginx configuration
sudo nginx -t

# Restart Nginx
sudo service nginx restart
```

### Out of Memory

```bash
# Check memory usage
free -h

# Restart with lower memory limit
pm2 restart ui-to-video-api --max-memory-restart 1G
```

## Performance Optimization

### For Higher Traffic

1. **Use Redis for job queue** (replace in-memory Map)
2. **Offload rendering to AWS Lambda** (see Remotion docs)
3. **Add CDN** for video delivery (S3 + CloudFront)
4. **Upgrade server** to 4 vCPUs, 8GB RAM

### Server Specs Recommendations

- **Low traffic** (<10 renders/day): 2 vCPUs, 4GB RAM ✅ Your current setup
- **Medium traffic** (10-50 renders/day): 4 vCPUs, 8GB RAM
- **High traffic** (50+ renders/day): AWS Lambda + S3

## Support

For issues, see:
- [WEB_UI_README.md](WEB_UI_README.md) - Complete documentation
- [README.md](README.md) - Quick start guide
- Laravel Forge docs: https://forge.laravel.com/docs
- Remotion docs: https://remotion.dev/docs

---

**Last updated**: December 2025
