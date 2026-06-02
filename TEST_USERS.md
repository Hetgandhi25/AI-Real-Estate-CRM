# 👤 Yandox CRM — Test Users & Accounts

> All verified working test accounts for the Yandox CRM system.

---

## 🔑 Login Page

Navigate to: **http://localhost:5173/login**

Or — if not already logged in — any protected route will automatically redirect you to the login page.

---

## ✅ Test Accounts

### 👑 Administrator Account

| Field | Value |
|-------|-------|
| **Email** | `admin@yandoxcrm.com` |
| **Password** | `Admin@123` |
| **Role** | `admin` |
| **Full Name** | Admin User |
| **Access Level** | Full access to everything |

**What ADMIN can do:**
- ✅ View and manage ALL modules
- ✅ Create, edit, delete Properties
- ✅ Create, edit, delete Customers
- ✅ Manage Agents (create, edit, delete agent accounts)
- ✅ View and manage Leads pipeline
- ✅ View Analytics center (full metrics)
- ✅ View and manage Appointments / Calendar
- ✅ View and manage Conversations / Messages
- ✅ View and manage Reviews
- ✅ Access Settings (profile, password, notifications, appearance)
- ✅ Access AI Bot assistant

---

### 🗂️ Manager Account

| Field | Value |
|-------|-------|
| **Email** | `manager@yandoxcrm.com` |
| **Password** | `Manager@123` |
| **Role** | `manager` |
| **Full Name** | Manager User |
| **Access Level** | Full access except agent management |

**What MANAGER can do:**
- ✅ View Properties (read + write)
- ✅ View and manage Customers
- ✅ View and manage Leads pipeline
- ✅ View Analytics (full charts and metrics)
- ✅ View Calendar / Appointments
- ✅ View and manage Conversations
- ✅ View Reviews
- ✅ Access Settings
- ✅ Access AI Bot
- ⚠️ Limited agent management (view only)

---

### 🏠 Agent Account

| Field | Value |
|-------|-------|
| **Email** | `agent@yandoxcrm.com` |
| **Password** | `Agent@123` |
| **Role** | `agent` |
| **Full Name** | Agent User |
| **Access Level** | Operational modules only |

**What AGENT can do:**
- ✅ View Properties
- ✅ View Customers assigned to them
- ✅ View and update their Leads
- ✅ View Calendar (their appointments)
- ✅ View Conversations
- ✅ View Reviews
- ✅ Access AI Bot
- ❌ Cannot access Analytics center
- ❌ Cannot access Agent management
- ❌ Cannot access Settings

---

### 🧪 Test / Guest Account

| Field | Value |
|-------|-------|
| **Email** | `test@yandoxcrm.com` |
| **Password** | `Test@123` |
| **Role** | `agent` |
| **Full Name** | Test User |
| **Access Level** | Same as Agent role |

**Use this account for:**
- Testing workflows without affecting main data
- Demonstrating the system to stakeholders
- Quick login for development testing

---

## 🔐 Password Rules

All passwords in this system must meet:

| Rule | Requirement |
|------|-------------|
| Minimum length | 8 characters |
| Format | Any characters allowed |
| Storage | Hashed with bcrypt (10 rounds) |
| Reset | Via Settings → Security tab |

---

## 🛡️ Role Permissions Matrix

| Module / Feature | Admin | Manager | Agent |
|-----------------|-------|---------|-------|
| Dashboard (Overview) | ✅ | ✅ | ✅ |
| Properties — View | ✅ | ✅ | ✅ |
| Properties — Create/Edit/Delete | ✅ | ✅ | ✅ |
| Customers — View | ✅ | ✅ | ✅ |
| Customers — Create/Edit/Delete | ✅ | ✅ | ✅ |
| Leads Pipeline | ✅ | ✅ | ✅ |
| Calendar / Appointments | ✅ | ✅ | ✅ |
| Messages / Conversations | ✅ | ✅ | ✅ |
| AI Bot Assistant | ✅ | ✅ | ✅ |
| Reviews | ✅ | ✅ | ✅ |
| Analytics Center | ✅ | ✅ | ❌ |
| Agent Management | ✅ | ✅ | ❌ |
| Settings Page | ✅ | ✅ | ❌ |

---

## 🔄 How to Re-seed Accounts

If you deleted any account or changed passwords and want to reset back to defaults:

```bash
# Navigate to backend directory
cd backend

# Reset the database and re-seed
npx prisma migrate reset

# Or just re-seed without resetting (adds accounts back if missing)
npx tsx prisma/seed.ts
```

> ⚠️ `prisma migrate reset` will delete ALL data. Use only when you want a clean slate.

---

## 🆕 Creating New User Accounts

### Via API (Admin only)

```bash
# Register a new user via the API
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Agent",
    "email": "newagent@yourcompany.com",
    "password": "SecurePass@123"
  }'
```

> **Note:** New accounts registered via API default to the `agent` role. Role changes must be done directly in the database via Prisma Studio.

### Via Prisma Studio (Database GUI)

```bash
# Open Prisma Studio — visual database editor
cd backend
npx prisma studio
# Opens at http://localhost:5555
```

1. Click on the `User` table
2. Click **Add record**
3. Fill in name, email, and **hashed** password
4. Set role to `admin`, `manager`, or `agent`

> ⚠️ Passwords stored in the database must be **bcrypt hashed**. Never store plain text passwords directly.

---

## 🔐 JWT Token Details

When you log in, the system issues two tokens:

| Token | Expiry | Purpose |
|-------|--------|---------|
| Access Token | 15 minutes | Used in every API request (`Authorization: Bearer <token>`) |
| Refresh Token | 7 days | Used to silently get a new access token |

The frontend automatically refreshes the access token before it expires — you won't be logged out unless the refresh token expires (7 days of inactivity).

---

## 🔑 Quick Login Reference Card

```
┌──────────────────────────────────────────────────────┐
│              YANDOX CRM — TEST CREDENTIALS           │
├──────────────────────────────────────────────────────┤
│  ADMIN   │ admin@yandoxcrm.com    │ Admin@123        │
│  MANAGER │ manager@yandoxcrm.com  │ Manager@123      │
│  AGENT   │ agent@yandoxcrm.com    │ Agent@123        │
│  TEST    │ test@yandoxcrm.com     │ Test@123         │
├──────────────────────────────────────────────────────┤
│  Login URL: http://localhost:5173/login              │
└──────────────────────────────────────────────────────┘
```
