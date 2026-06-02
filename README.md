# 🏠 Production-Grade MERN Real Estate CRM

A modern, enterprise-ready, MERN-stack Customer Relationship Management (CRM) platform designed specifically for real estate agencies. It enables teams to manage listings, customer profiles, sales pipelines, agent assignments, appointments, reviews, and automated messaging through an intuitive dashboard.

---

## 🚀 Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 + Radix UI primitives (Accordion, Dialog, Select, Dropdown, Tabs)
- **Routing**: TanStack Router (Fully type-safe route paths)
- **State Management**: TanStack Query (React Query) for optimistic, cached server requests
- **Charts**: Recharts (Responsive performance/growth visualizations)

### Backend
- **Runtime**: Node.js + Express + TypeScript + tsx watch
- **Database ORM**: Prisma ORM (Type-safe queries, relations, schema management)
- **Database Engine**: PostgreSQL
- **Security**: JWT Authentication (Secure HTTP-Only cookies with separate short-lived Access and long-lived Refresh tokens), Zod runtime schema validations, CORS, and Helmet headers

---

## 📦 Features Overview

1. **📊 Interactive Dashboard**: High-level KPIs (Revenue, Conversion rates, agent leaderboards) and monthly analytics charts.
2. **🏢 Property CRM**: Full Property CRUD operations (Add, Edit, Delete, View details) with modal-based forms, amenities management, and simulated image uploading.
3. **👥 Lead Management**: Pipeline staging tracking (NEW, CONTACTED, QUALIFIED, WON, LOST) with agent assignment and status updates.
4. **📅 Calendar Scheduler**: Booking and tracking agent appointments for property showings.
5. **💬 Conversations & AI Assistant**: Exchanging client messages with automatic AI-driven responses matching inquiry criteria.
6. **⭐ Reviews & Ratings**: Client-to-agent reviews and ratings management.
7. **🔒 Role-Based Authorization**: Route guards protecting features according to role memberships (Admin, Manager, Agent).

---

## 🛠️ Project Structure

```
├── backend/                   # Express backend codebase
│   ├── prisma/                # Prisma Schema, Migrations, and Seed script
│   │   ├── schema.prisma      # PostgreSQL database schema
│   │   └── seed.ts            # Complete database seeder
│   ├── src/
│   │   ├── common/            # Shared utilities, middlewares, and errors
│   │   ├── modules/           # Feature modules (Auth, Properties, Leads, etc.)
│   │   └── server.ts          # Server entry file
│   └── tsconfig.json
├── src/                       # React frontend codebase
│   ├── components/            # Reusable UI & layout elements
│   ├── config/                # Environment variables parsing
│   ├── features/              # Feature-based pages and client state modules
│   ├── hooks/                 # Custom React hooks (Query, Toast, Session)
│   ├── providers/             # Global React providers
│   ├── routes/                # TanStack Router type-safe page directories
│   └── styles.css             # Main styling system
├── package.json
└── tsconfig.json
```

---

## 💻 Local Setup & Installation

### Prerequisites
- **Node.js** v18+ installed
- **PostgreSQL** server running locally

---

### Step 1: Clone and Configure Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment configuration file:
   ```bash
   cp .env.example .env
   ```
4. Open the newly created `.env` file and set your database connection URL:
   ```env
   DATABASE_URL="postgresql://<username>:<password>@localhost:5432/<database_name>?schema=public"
   ```
5. Run the Prisma commands to generate client files and apply migrations:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```
6. Seed the database with mock accounts, properties, and leads:
   ```bash
   npm run seed
   ```
7. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The backend will run on **http://localhost:4000***.

---

### Step 2: Configure and Start Frontend

1. Return to the root workspace directory and install dependencies:
   ```bash
   cd ..
   npm install
   ```
2. Copy environment configuration file:
   ```bash
   cp .env.example .env
   ```
3. Start the frontend development server:
   ```bash
   npm run dev
   ```
   *The frontend will run on **http://localhost:8080***.

---

## 🧪 Testing Workflows

The repository contains automated test suites to ensure database integrity, JWT handling, role accessibility, and pipeline operations:

- **Backend API Smoke Tests**:
  Runs basic verification of CRUD endpoints and auth tokens.
  ```bash
  node backend/api-smoke-test.mjs
  ```
- **SaaS E2E Master Integration Suite**:
  Executes 109 assertions checking all CRM workflow sections, cascading database integrity, and KPI computations.
  ```bash
  node e2e-saas-tests.mjs
  ```

