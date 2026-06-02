# 🚀 Yandox CRM — Run System Guide

> Step-by-step instructions to start, stop, and manage the Yandox CRM application.

---

## ⚡ Quick Start (TL;DR)

If you just want to run it immediately, open **two separate terminal windows** and run:

**Terminal 1 — Backend:**
```bash
cd yandox-crm-source/backend
npm install
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd yandox-crm-source
npm install
npm run dev
```

Then open your browser at: **http://localhost:5173**

Login with: `admin@yandoxcrm.com` / `Admin@123`

---

## 📋 Full Setup Instructions

### Step 1: Get the Project

```bash
# If you have the zip file, extract it
# Then navigate into the project folder
cd yandox-crm-source
```

---

### Step 2: Setup the Backend

Open a terminal and run these commands one by one:

```bash
# Navigate to the backend directory
cd backend

# Install all backend dependencies
npm install

# This will install: Express, Prisma, bcrypt, jsonwebtoken, zod, etc.
# Takes 1-2 minutes on first run
```

**Verify the backend `.env` file exists:**

```bash
# Check if .env exists (Windows)
dir .env

# If it doesn't exist, create it:
# Copy the example file
copy .env.example .env
```

The `backend/.env` should contain:

```env
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
DATABASE_URL="file:./dev.db"
JWT_ACCESS_TOKEN_SECRET=myverystrongsupersecureaccesssecretkey123456789
JWT_REFRESH_TOKEN_SECRET=myverystrongsupersecurerefreshsecretkey987654321
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=7d
COOKIE_SECURE=false
REFRESH_TOKEN_COOKIE_NAME=refresh_token
```

---

### Step 3: Setup the Database

```bash
# Make sure you're inside the backend/ directory
cd backend

# Generate Prisma client (run after any schema changes)
npx prisma generate

# Run database migrations (creates the database tables)
npx prisma migrate dev --name init

# Seed the database with demo data
# This creates 4 users, 3 agents, 8 properties, 6 customers,
# 7 leads, 4 conversations, 5 reviews, 6 appointments
npx tsx prisma/seed.ts
```

> ✅ After seeding, you will see:
> ```
> ✅ Seed data created successfully.
> ─────────────────────────────────────────────────
> Test Accounts:
>   ADMIN   admin@yandoxcrm.com   / Admin@123
>   MANAGER manager@yandoxcrm.com / Manager@123
>   AGENT   agent@yandoxcrm.com   / Agent@123
>   TEST    test@yandoxcrm.com    / Test@123
> ─────────────────────────────────────────────────
> ```

---

### Step 4: Start the Backend Server

```bash
# Make sure you're inside the backend/ directory
cd backend

# Start backend in development mode (auto-restarts on code changes)
npm run dev
```

> ✅ You should see:
> ```
> Backend server running on http://localhost:4000
> ```

**Keep this terminal open.** The backend must stay running.

---

### Step 5: Setup the Frontend

Open a **new terminal window** (keep the backend terminal open):

```bash
# Navigate to the root project directory (NOT backend/)
cd yandox-crm-source

# Install all frontend dependencies
npm install

# This installs: React, Vite, TanStack Router/Query, Recharts, Tailwind, etc.
# Takes 1-3 minutes on first run
```

**Verify the frontend `.env` file exists:**

```bash
# Check if .env exists
dir .env

# If it doesn't exist, create it manually with this content:
```

The root `.env` should contain:

```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_API_TIMEOUT=30000
VITE_AUTH_TOKEN_KEY=yandox_access_token
VITE_AUTH_REFRESH_TOKEN_KEY=yandox_refresh_token
VITE_MOCK_AUTH=false
VITE_ENABLE_QUERY_DEVTOOLS=true
VITE_APP_NAME=Yandox
```

> ⚠️ **IMPORTANT:** `VITE_MOCK_AUTH=false` means the app will use the real backend.
> If you set it to `true`, the app runs with mock data (no backend needed, but no real data).

---

### Step 6: Start the Frontend Dev Server

```bash
# Make sure you're in the root directory (yandox-crm-source/)
npm run dev
```

> ✅ You should see:
> ```
>   VITE v7.3.3  ready in 1969 ms
>
>   ➜  Local:   http://localhost:5173/
>   ➜  Network: http://192.168.x.x:5173/
> ```

---

### Step 7: Open the Application

Open your browser and navigate to:

```
http://localhost:5173
```

You will be redirected to the login page. Use any of the test accounts from [TEST_USERS.md](./TEST_USERS.md).

---

## 🗂️ All Terminal Commands Reference

### Backend Commands

```bash
# Navigate to backend
cd backend

# ─── DEVELOPMENT ──────────────────────────────────────
# Start dev server (auto-restart on changes)
npm run dev

# ─── BUILDING ────────────────────────────────────────
# Compile TypeScript to JavaScript
npm run build

# Start compiled production server
npm start

# ─── DATABASE ────────────────────────────────────────
# Generate Prisma client (after schema changes)
npx prisma generate

# Create and apply new migration
npx prisma migrate dev --name <migration-name>

# Reset database (DANGER: deletes all data)
npx prisma migrate reset

# Open Prisma Studio (visual DB browser)
npx prisma studio

# Seed database with demo data
npx tsx prisma/seed.ts

# ─── CODE QUALITY ────────────────────────────────────
# TypeScript type check
npm run build

# Lint code
npm run lint
```

### Frontend Commands

```bash
# Navigate to root (NOT backend/)
cd yandox-crm-source

# ─── DEVELOPMENT ──────────────────────────────────────
# Start dev server with HMR (Hot Module Replacement)
npm run dev

# ─── BUILDING ────────────────────────────────────────
# Build for production
npm run build

# Preview production build locally
npm run preview

# ─── CODE QUALITY ────────────────────────────────────
# TypeScript type check (no output = no errors)
npm run typecheck

# Lint code
npm run lint

# Format code with Prettier
npm run format
```

---

## 🌐 Port Reference

| Service | Default Port | URL |
|---------|-------------|-----|
| Frontend (Vite dev) | 5173 | http://localhost:5173 |
| Backend (Express) | 4000 | http://localhost:4000 |
| Backend API | 4000 | http://localhost:4000/api |
| Prisma Studio | 5555 | http://localhost:5555 |

---

## 🔍 Verify Everything Works

After starting both servers, test these URLs in your browser or with curl:

```bash
# 1. Backend health check
curl http://localhost:4000/api/health
# Expected: {"data":{"status":"ok","timestamp":"..."},"success":true}

# 2. Properties list (public)
curl http://localhost:4000/api/properties
# Expected: {"data":{"data":[...],"meta":{...}},"success":true}

# 3. Frontend (should redirect to /login)
# Open: http://localhost:5173
```

---

## 🔄 Restarting After a Computer Reboot

Every time you restart your computer, you need to start both servers again:

```bash
# Terminal 1 — Backend
cd yandox-crm-source/backend
npm run dev

# Terminal 2 — Frontend
cd yandox-crm-source
npm run dev
```

The database (`backend/prisma/dev.db`) persists automatically — no need to re-seed.

---

## 🛑 Stopping the Servers

In each terminal, press:

```
Ctrl + C
```

This gracefully stops the server.

---

## 🐛 Common Issues & Fixes

### ❌ "Port 4000 already in use"

```bash
# Find the process using port 4000 (Windows)
netstat -ano | findstr :4000

# Kill it by PID (replace 12345 with actual PID)
taskkill /PID 12345 /F

# Then restart backend
npm run dev
```

### ❌ "Port 5173 already in use"

```bash
# Vite will automatically try the next port (5174, 5175...)
# Or kill it and restart
npm run dev
```

### ❌ "Cannot find module" errors

```bash
# Re-install dependencies
cd backend && npm install
cd .. && npm install
```

### ❌ "Database file not found" or Prisma errors

```bash
cd backend

# Regenerate Prisma client
npx prisma generate

# Re-run migrations
npx prisma migrate dev --name init

# Re-seed database
npx tsx prisma/seed.ts
```

### ❌ Login fails / "Invalid email or password"

```bash
# Database may need re-seeding
cd backend
npx tsx prisma/seed.ts
```

### ❌ Frontend shows blank page or infinite loading

1. Check that backend is running: `http://localhost:4000/api/health`
2. Check that `VITE_API_BASE_URL=http://localhost:4000/api` in root `.env`
3. Check that `VITE_MOCK_AUTH=false` in root `.env`
4. Hard refresh browser: `Ctrl + Shift + R`

### ❌ TypeScript errors during build

```bash
# Frontend
npm run typecheck

# Backend
cd backend && npm run build
```

---

## 🧪 Development Mode vs Production Mode

| Feature | Development | Production |
|---------|-------------|-----------|
| Server | `npm run dev` | `npm start` |
| Auto-restart | ✅ Yes (tsx watch) | ❌ No |
| Source maps | ✅ Yes | ❌ No |
| Query DevTools | ✅ Yes | ❌ No |
| Database | SQLite (dev.db) | PostgreSQL recommended |
| VITE_MOCK_AUTH | false | false |
| COOKIE_SECURE | false | true (requires HTTPS) |

---

*See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for production deployment instructions.*
