# 🏠 Yandox CRM — Project Setup Guide

> Complete guide to setting up the Yandox Real Estate CRM system from scratch.

---

## 📌 What is Yandox CRM?

Yandox is a **production-grade Real Estate CRM** (Customer Relationship Management) system built for property agencies. It helps teams manage:

- 🏘️ Property listings with full CRUD
- 👥 Customer profiles and budgets
- 📊 Lead pipeline tracking (NEW → CONTACTED → QUALIFIED → WON → LOST)
- 📅 Appointment scheduling
- 💬 Customer conversations with AI-assisted replies
- ⭐ Customer reviews and ratings
- 📈 Analytics dashboards with real-time charts
- 👨‍💼 Agent management and performance scoring

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.x | UI framework |
| TypeScript | 5.8.x | Type safety |
| Vite | 7.x | Build tool & dev server |
| TanStack Router | 1.x | File-based routing |
| TanStack Query | 5.x | Server state management |
| Recharts | 2.x | Charts & analytics |
| Tailwind CSS | 4.x | Utility-first styling |
| Radix UI | latest | Accessible UI components |
| Axios | 1.x | HTTP client |
| Lucide React | 0.575.x | Icon library |
| Zod | 3.x | Schema validation |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 20+ | JavaScript runtime |
| Express | 4.x | HTTP framework |
| TypeScript | 5.6.x | Type safety |
| Prisma | 5.22.x | ORM & database client |
| SQLite | - | Development database |
| JWT (jsonwebtoken) | 9.x | Authentication tokens |
| bcrypt | 5.x | Password hashing |
| Zod | 3.x | Request validation |
| Helmet | 7.x | Security headers |
| Morgan | 1.x | HTTP request logger |
| tsx | 4.x | TypeScript runner |

---

## 📋 Prerequisites

Before you begin, make sure you have the following installed:

### Required Software

| Software | Minimum Version | Check Command |
|----------|----------------|---------------|
| Node.js | 20.x or higher | `node --version` |
| npm | 9.x or higher | `npm --version` |
| Git | Any | `git --version` |

### How to Install Node.js

1. Visit [https://nodejs.org](https://nodejs.org)
2. Download the **LTS version** (recommended)
3. Run the installer
4. Verify: `node --version` should show `v20.x.x` or higher

---

## 📁 Project Structure

```
yandox-crm-source/
│
├── 📁 src/                          # Frontend source code
│   ├── 📁 api/                      # API client, endpoints, query keys
│   │   ├── apiClient.ts             # Axios instance with interceptors
│   │   ├── endpoints.ts             # All API endpoint URLs
│   │   ├── errors.ts                # API error normalization
│   │   └── query-keys.ts            # TanStack Query cache keys
│   ├── 📁 components/               # Reusable UI components
│   │   ├── 📁 common/               # Shared form components
│   │   └── 📁 ui/                   # Radix-based UI primitives
│   ├── 📁 config/                   # Frontend configuration
│   ├── 📁 constants/                # App-wide constants & routes
│   ├── 📁 features/                 # Feature-specific components
│   ├── 📁 hooks/                    # Custom React hooks
│   │   └── 📁 queries/              # TanStack Query hooks per module
│   ├── 📁 lib/                      # Utilities (auth-guard, formatters)
│   ├── 📁 providers/                # React context providers
│   ├── 📁 routes/                   # Page components (file-based routing)
│   │   ├── __root.tsx               # Root layout (sidebar + header)
│   │   ├── index.tsx                # Dashboard page (/)
│   │   ├── login.tsx                # Login page (/login)
│   │   ├── property.tsx             # Properties (/property)
│   │   ├── customers.tsx            # Customers (/customers)
│   │   ├── agents.tsx               # Agents (/agents)
│   │   ├── leads.tsx                # Leads pipeline (/leads)
│   │   ├── messages.tsx             # Conversations (/messages)
│   │   ├── ai-bot.tsx               # AI assistant (/ai-bot)
│   │   ├── analytics.tsx            # Analytics center (/analytics)
│   │   ├── calendar.tsx             # Appointments (/calendar)
│   │   ├── reviews.tsx              # Reviews (/reviews)
│   │   └── settings.tsx             # Settings (/settings)
│   ├── 📁 services/                 # API service functions per module
│   ├── 📁 store/                    # Auth token store
│   ├── 📁 types/                    # TypeScript type definitions
│   ├── styles.css                   # Global Tailwind CSS styles
│   └── main.tsx                     # React app entry point
│
├── 📁 backend/                      # Backend source code
│   ├── 📁 src/
│   │   ├── 📁 config/               # Environment config loader
│   │   ├── 📁 constants/            # Backend constants
│   │   ├── 📁 controllers/          # Route handler functions
│   │   │   ├── auth.controller.ts
│   │   │   ├── property.controller.ts
│   │   │   ├── customer.controller.ts
│   │   │   ├── lead.controller.ts
│   │   │   ├── agent.controller.ts
│   │   │   ├── conversation.controller.ts
│   │   │   ├── review.controller.ts
│   │   │   ├── appointment.controller.ts
│   │   │   └── dashboard.controller.ts
│   │   ├── 📁 services/             # Business logic layer
│   │   ├── 📁 routes/               # Express route definitions
│   │   ├── 📁 middleware/           # Auth, error, validation middleware
│   │   ├── 📁 validators/           # Zod request schemas
│   │   ├── 📁 lib/                  # API response helpers
│   │   ├── 📁 utils/                # JWT, cookie utilities
│   │   ├── 📁 types/                # Backend TypeScript types
│   │   ├── 📁 prisma/               # Prisma client instance
│   │   ├── app.ts                   # Express app setup
│   │   └── server.ts                # HTTP server entry point
│   ├── 📁 prisma/
│   │   ├── schema.prisma            # Database schema
│   │   ├── seed.ts                  # Demo data seeder
│   │   └── dev.db                   # SQLite database file
│   ├── .env                         # Backend environment variables
│   └── package.json
│
├── .env                             # Frontend environment variables
├── package.json                     # Frontend dependencies
├── vite.config.ts                   # Vite configuration
└── tsconfig.json                    # TypeScript configuration
```

---

## ⚙️ Environment Variables

### Frontend `.env` (root directory)

```env
# Backend API URL — must match backend port
VITE_API_BASE_URL=http://localhost:4000/api

# Request timeout in milliseconds
VITE_API_TIMEOUT=30000

# LocalStorage keys for token persistence
VITE_AUTH_TOKEN_KEY=yandox_access_token
VITE_AUTH_REFRESH_TOKEN_KEY=yandox_refresh_token

# IMPORTANT: Set to false to use real backend authentication
# Set to true for frontend-only development (mock data, no backend needed)
VITE_MOCK_AUTH=false

# Enable/disable TanStack Query DevTools (recommended: true in dev)
VITE_ENABLE_QUERY_DEVTOOLS=true

# Application display name
VITE_APP_NAME=Yandox
```

### Backend `.env` (inside `backend/` directory)

```env
# Server port
PORT=4000

# Environment: development | production | test
NODE_ENV=development

# Allowed frontend origin (must match frontend dev server URL)
CORS_ORIGIN=http://localhost:5173

# Database (SQLite for development)
DATABASE_URL="file:./dev.db"

# JWT Access Token (short-lived: 15 minutes)
# IMPORTANT: Change this to a long random string in production!
JWT_ACCESS_TOKEN_SECRET=myverystrongsupersecureaccesssecretkey123456789

# JWT Refresh Token (long-lived: 7 days)
# IMPORTANT: Change this to a different long random string in production!
JWT_REFRESH_TOKEN_SECRET=myverystrongsupersecurerefreshsecretkey987654321

# Token expiry durations
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=7d

# Cookie settings
# Set to true in production (requires HTTPS)
COOKIE_SECURE=false
REFRESH_TOKEN_COOKIE_NAME=refresh_token
```

---

## 🗄️ Database Schema

The system uses **Prisma ORM** with **SQLite** (development) database.

### Database Models

| Model | Description | Key Fields |
|-------|-------------|-----------|
| `User` | System users (login accounts) | id, name, email, password, role |
| `Agent` | Real estate agent profiles | id, userId, experience, specialization, performanceScore |
| `Property` | Property listings | id, title, price, city, propertyType, status |
| `Customer` | Client records | id, name, email, phone, budget, preferredLocation |
| `Lead` | Sales pipeline entries | id, customerId, propertyId, status, source |
| `Conversation` | Chat threads | id, customerId, messages (JSON), aiSummary |
| `Review` | Customer reviews | id, customerId, rating, comment |
| `Appointment` | Scheduled meetings | id, customerId, propertyId, scheduledAt, status |
| `Analytics` | Metric snapshots | id, metric, value, recordedAt |

### Property Types (Valid Values)
`APARTMENT`, `VILLA`, `STUDIO`, `PENTHOUSE`, `OFFICE`, `HOTEL`, `LOFT`

### Lead Pipeline Statuses
`NEW` → `CONTACTED` → `QUALIFIED` → `WON` → `LOST`

### Appointment Statuses
`SCHEDULED` → `CONFIRMED` → `COMPLETED` | `CANCELLED`

---

## 🔐 Authentication Architecture

The system uses **dual-token JWT authentication**:

```
┌─────────────────────────────────────────────────────┐
│                   Auth Flow                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. User logs in → POST /api/auth/login             │
│                                                     │
│  2. Backend returns:                                │
│     • accessToken (JWT, 15 min expiry)              │
│     • refreshToken (JWT, 7 days expiry)             │
│     • user profile object                           │
│                                                     │
│  3. Frontend stores both tokens in localStorage     │
│                                                     │
│  4. API requests include:                           │
│     Authorization: Bearer <accessToken>             │
│                                                     │
│  5. When accessToken expires:                       │
│     POST /api/auth/refresh → new tokens             │
│                                                     │
│  6. Logout: POST /api/auth/logout                   │
│     → refresh token cleared from DB                 │
│     → tokens removed from localStorage             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Role-Based Access Control

| Role | Permissions |
|------|-------------|
| `admin` | Full access to all modules including Settings & Agents |
| `manager` | Access to most modules including Analytics |
| `agent` | Access to Properties, Customers, Leads, Calendar, Reviews |

---

## 📡 API Contract

All API responses follow this envelope format:

```json
// Success response
{
  "data": { ... },
  "success": true
}

// Error response
{
  "error": "Error message here",
  "status": 400,
  "success": false
}
```

### Paginated responses (Properties, Customers)
```json
{
  "data": {
    "data": [...],
    "meta": {
      "page": 1,
      "pageSize": 50,
      "total": 100,
      "totalPages": 2
    }
  },
  "success": true
}
```

---

*For running the system, see [RUN_SYSTEM.md](./RUN_SYSTEM.md)*
*For test accounts, see [TEST_USERS.md](./TEST_USERS.md)*
*For all features, see [FEATURES_OVERVIEW.md](./FEATURES_OVERVIEW.md)*
