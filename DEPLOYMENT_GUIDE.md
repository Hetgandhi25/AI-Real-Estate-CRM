# 🚀 Yandox CRM — Deployment Guide

> Complete guide for deploying the Yandox CRM to production environments.

---

## ⚠️ Before You Deploy

### Required Changes for Production

| Item | Development | Production |
|------|------------|------------|
| Database | SQLite (dev.db) | PostgreSQL / PlanetScale |
| COOKIE_SECURE | false | **true** (requires HTTPS) |
| JWT Secrets | Any string | **Strong random secrets** |
| CORS_ORIGIN | localhost:5173 | **Your production domain** |
| NODE_ENV | development | **production** |
| VITE_MOCK_AUTH | false | false |
| VITE_API_BASE_URL | localhost:4000 | **Your API domain** |

---

## 🔑 Generating Secure JWT Secrets

**Never use the development secrets in production!**

```bash
# Generate a strong random secret (run in terminal)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Run twice to get two different secrets:
# Secret 1 → Use for JWT_ACCESS_TOKEN_SECRET
# Secret 2 → Use for JWT_REFRESH_TOKEN_SECRET
```

Example output (yours will be different):
```
a7f3c9b2e84d1f6a0c5e8b3d9f2a6c1e4b7d0f3a9c2e5b8d1f4a7c0e3b6d9f2
```

---

## 🗄️ Database: Switching to PostgreSQL

### Step 1: Update `backend/prisma/schema.prisma`

```prisma
// Change this:
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// To this:
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Step 2: Update `backend/.env`

```env
# Replace the SQLite URL with PostgreSQL
DATABASE_URL="postgresql://username:password@host:5432/yandox_crm?schema=public"
```

### Step 3: Re-run migrations

```bash
cd backend

# Generate new Prisma client for PostgreSQL
npx prisma generate

# Run migrations on PostgreSQL
npx prisma migrate deploy

# Seed production data (optional)
npx tsx prisma/seed.ts
```

### Recommended PostgreSQL Providers

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| [Supabase](https://supabase.com) | 500MB | Best free option |
| [Railway](https://railway.app) | $5 credit | Easy setup |
| [Neon](https://neon.tech) | 3GB | Serverless PostgreSQL |
| [PlanetScale](https://planetscale.com) | 10GB | MySQL-compatible |
| [ElephantSQL](https://elephantsql.com) | 20MB | Basic free tier |

---

## 🌐 Deployment Options

---

### Option A: Deploy to Railway (Recommended — Easy)

Railway can host both the backend and frontend from the same repo.

#### Backend on Railway

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Connect your GitHub repository
4. Click **"Add Service"** → Select the `backend` folder
5. Set the **Root Directory** to `backend`
6. Set **Build Command**: `npm install && npm run build`
7. Set **Start Command**: `npm start`
8. Add Environment Variables:

```env
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-url.railway.app
DATABASE_URL=postgresql://...   ← your Railway PostgreSQL URL
JWT_ACCESS_TOKEN_SECRET=<your-strong-secret-1>
JWT_REFRESH_TOKEN_SECRET=<your-strong-secret-2>
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=7d
COOKIE_SECURE=true
REFRESH_TOKEN_COOKIE_NAME=refresh_token
```

9. Railway auto-detects Node.js and deploys

#### Frontend on Railway (or Netlify/Vercel)

For the React frontend, use **Netlify** or **Vercel** (better for static sites):

---

### Option B: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New Project"**
3. Connect your GitHub repository
4. Set **Root Directory** to `.` (the project root, not `backend/`)
5. Set **Build Command**: `npm run build`
6. Set **Output Directory**: `dist`
7. Add Environment Variables:

```env
VITE_API_BASE_URL=https://your-backend-url.railway.app/api
VITE_API_TIMEOUT=30000
VITE_AUTH_TOKEN_KEY=yandox_access_token
VITE_AUTH_REFRESH_TOKEN_KEY=yandox_refresh_token
VITE_MOCK_AUTH=false
VITE_ENABLE_QUERY_DEVTOOLS=false
VITE_APP_NAME=Yandox
```

8. Click **Deploy**

---

### Option C: Deploy Frontend to Netlify

1. Go to [netlify.com](https://netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your GitHub repo
4. **Base directory**: (empty — project root)
5. **Build command**: `npm run build`
6. **Publish directory**: `dist/client`
7. Add environment variables (same as Vercel above)
8. Add a `netlify.toml` file to the project root:

```toml
[build]
  command = "npm run build"
  publish = "dist/client"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

### Option D: Deploy Backend to Render

1. Go to [render.com](https://render.com)
2. Click **"New"** → **"Web Service"**
3. Connect your GitHub repo
4. Set **Root Directory**: `backend`
5. Set **Build Command**: `npm install && npx prisma generate && npm run build`
6. Set **Start Command**: `npm start`
7. Set **Instance Type**: Free (or paid for production)
8. Add environment variables (same as Railway backend above)

---

### Option E: Self-Hosted (VPS — Ubuntu/Debian)

#### Prerequisites

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (reverse proxy)
sudo apt install -y nginx

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Verify
node --version  # v20.x.x
npm --version   # 9.x.x
```

#### Step 1: Setup PostgreSQL

```bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql

# Inside psql:
CREATE DATABASE yandox_crm;
CREATE USER yandox_user WITH PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE yandox_crm TO yandox_user;
\q
```

#### Step 2: Clone and Configure

```bash
# Create app directory
mkdir -p /var/www/yandox
cd /var/www/yandox

# Clone or copy your project
git clone https://github.com/your-username/yandox-crm-source.git .
# OR use: scp -r local-folder/ user@server:/var/www/yandox/

# Setup backend
cd backend
cp .env.example .env
nano .env  # Edit with production values (see env section below)

# Install dependencies
npm install

# Generate Prisma client + run migrations
npx prisma generate
npx prisma migrate deploy
npx tsx prisma/seed.ts

# Build backend
npm run build

# Go back to root
cd ..

# Setup frontend
cp .env.example .env
nano .env  # Edit VITE_API_BASE_URL to your domain
npm install
npm run build
```

#### Step 3: Configure PM2

Create `ecosystem.config.js` in `/var/www/yandox/backend/`:

```javascript
module.exports = {
  apps: [
    {
      name: "yandox-backend",
      script: "dist/server.js",
      cwd: "/var/www/yandox/backend",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
    },
  ],
};
```

```bash
# Start with PM2
cd /var/www/yandox/backend
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Auto-start PM2 on server reboot
pm2 startup
# Follow the command it outputs

# Check status
pm2 status
pm2 logs yandox-backend
```

#### Step 4: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/yandox
```

Paste this config:

```nginx
# Frontend
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    root /var/www/yandox/dist/client;
    index index.html;

    # React Router support — always serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets caching
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Backend API
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/yandox /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

#### Step 5: Setup HTTPS with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com -d api.your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

---

## 📋 Production Environment Variables

### Backend Production `.env`

```env
PORT=4000
NODE_ENV=production

# Your production frontend URL
CORS_ORIGIN=https://your-domain.com

# PostgreSQL connection string
DATABASE_URL="postgresql://yandox_user:your_strong_password@localhost:5432/yandox_crm?schema=public"

# STRONG random secrets — generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_TOKEN_SECRET=<64-char-random-hex>
JWT_REFRESH_TOKEN_SECRET=<different-64-char-random-hex>

JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=7d

# Must be true in production (requires HTTPS)
COOKIE_SECURE=true
REFRESH_TOKEN_COOKIE_NAME=refresh_token
```

### Frontend Production `.env`

```env
# Your production API URL
VITE_API_BASE_URL=https://api.your-domain.com/api
VITE_API_TIMEOUT=30000
VITE_AUTH_TOKEN_KEY=yandox_access_token
VITE_AUTH_REFRESH_TOKEN_KEY=yandox_refresh_token

# Never use mock auth in production
VITE_MOCK_AUTH=false

# Disable devtools in production
VITE_ENABLE_QUERY_DEVTOOLS=false

VITE_APP_NAME=Yandox
```

---

## 🔄 CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Yandox CRM

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install frontend deps
        run: npm ci
      - name: TypeScript check
        run: npm run typecheck
      - name: Build frontend
        run: npm run build
      - name: Install backend deps
        run: cd backend && npm ci
      - name: Build backend
        run: cd backend && npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.7
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/yandox
            git pull origin main
            cd backend && npm ci && npx prisma migrate deploy && npm run build
            cd .. && npm ci && npm run build
            pm2 restart yandox-backend
```

---

## 📊 Post-Deployment Verification

After deploying, verify these endpoints work:

```bash
# 1. Health check
curl https://api.your-domain.com/api/health

# 2. Login
curl -X POST https://api.your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yandoxcrm.com","password":"Admin@123"}'

# 3. Public properties
curl https://api.your-domain.com/api/properties
```

---

## 🔒 Production Security Checklist

```
PRODUCTION SECURITY CHECKLIST
═══════════════════════════════════════════════════════

  ENVIRONMENT
  [ ] JWT secrets are long random strings (64+ chars)
  [ ] COOKIE_SECURE=true
  [ ] NODE_ENV=production
  [ ] VITE_MOCK_AUTH=false
  [ ] No .env files committed to git

  DATABASE
  [ ] Using PostgreSQL (not SQLite)
  [ ] Database user has only necessary permissions
  [ ] DATABASE_URL not exposed in logs
  [ ] Regular database backups configured

  NETWORK
  [ ] HTTPS enabled (SSL certificate)
  [ ] HTTP → HTTPS redirect configured
  [ ] CORS restricted to production domain only
  [ ] Firewall: only ports 80 and 443 open publicly

  SERVER
  [ ] Node.js process managed by PM2
  [ ] PM2 auto-restart on crash enabled
  [ ] PM2 auto-start on reboot enabled
  [ ] Server security patches up to date

  APPLICATION
  [ ] Helmet security headers enabled ✅ (already in code)
  [ ] Rate limiting on auth endpoints (recommended to add)
  [ ] Error messages don't expose stack traces in production

═══════════════════════════════════════════════════════
```

---

## 🆙 Updating the Application

```bash
# On your VPS
cd /var/www/yandox

# Pull latest code
git pull origin main

# Update backend
cd backend
npm install
npx prisma generate
npx prisma migrate deploy  # Apply any new migrations
npm run build

# Update frontend
cd ..
npm install
npm run build

# Restart backend (frontend is static, just rebuilt)
pm2 restart yandox-backend

# Verify
pm2 status
curl http://localhost:4000/api/health
```

---

## 🔄 Database Backup

```bash
# Backup PostgreSQL database
pg_dump -U yandox_user yandox_crm > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -U yandox_user yandox_crm < backup_20260525.sql

# Automate with cron (daily at 2am)
crontab -e
# Add: 0 2 * * * pg_dump -U yandox_user yandox_crm > /backups/yandox_$(date +\%Y\%m\%d).sql
```

---

## 🐛 Production Troubleshooting

### Backend won't start

```bash
# Check PM2 logs
pm2 logs yandox-backend

# Check for port conflicts
sudo netstat -tlnp | grep 4000

# Check environment variables loaded
pm2 env 0
```

### Frontend shows blank page

```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Verify build exists
ls /var/www/yandox/dist/client/

# Check Nginx config
sudo nginx -t
```

### Database connection errors

```bash
# Test database connection
cd /var/www/yandox/backend
npx prisma db push

# Check PostgreSQL is running
sudo systemctl status postgresql
```

### 401 errors on all API requests

- Check `JWT_ACCESS_TOKEN_SECRET` in backend `.env`
- Check `VITE_API_BASE_URL` in frontend `.env`
- Check CORS origin settings

---

*For setup instructions, see [PROJECT_SETUP.md](./PROJECT_SETUP.md)*
*For running locally, see [RUN_SYSTEM.md](./RUN_SYSTEM.md)*
