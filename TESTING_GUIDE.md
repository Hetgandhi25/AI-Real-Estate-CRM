# 🧪 Yandox CRM — Testing Guide

> Complete guide for testing the Yandox CRM system — from manual testing to automated API tests.

---

## 📋 Testing Checklist Overview

```
✅ Backend API Tests        → Automated (node e2e-test.mjs)
✅ TypeScript Compilation   → npm run typecheck / npm run build
✅ Manual UI Tests          → Browser walkthrough
✅ Auth Lifecycle Tests     → Login, refresh, logout
✅ CRUD Tests               → All modules
✅ Database Tests           → Prisma Studio / seed validation
```

---

## 1. 🔧 Pre-Test Setup

Before running any tests, make sure both servers are running:

```bash
# Terminal 1 — Backend
cd backend
npm run dev
# Should show: "Backend server running on http://localhost:4000"

# Terminal 2 — Frontend
cd ..   (or navigate to yandox-crm-source root)
npm run dev
# Should show: "VITE v7.x.x  ready"
```

Verify the backend is healthy:

```bash
curl http://localhost:4000/api/health
```

Expected response:
```json
{
  "data": { "status": "ok", "timestamp": "2026-05-25T..." },
  "success": true
}
```

---

## 2. ⚡ Automated E2E API Test Suite

The project includes a full automated test suite that tests all 11 API modules.

### Run the E2E Tests

```bash
# From the project root (yandox-crm-source/)
# Make sure backend is running first!

node api-tests.mjs
```

### What the E2E Test Covers

| Test Section | Tests | What It Checks |
|-------------|-------|----------------|
| Health Check | 1 | Backend server responds |
| Auth Lifecycle | 10 | Login, wrong password, token refresh, profile update, logout, JWT tamper |
| Properties CRUD | 9 | List, get by ID, create, update, delete, search |
| Customers CRUD | 5 | List, create, update, delete, duplicate email guard |
| Leads Pipeline | 11 | List, status transitions (NEW→CONTACTED→QUALIFIED→WON→LOST), notes |
| Agents CRUD | 3 | List, update, performance scores |
| Conversations + AI | 5 | List, threading, AI auto-response, create, delete |
| Dashboard + Analytics | 13 | All KPI keys, all chart data keys |
| Appointments CRUD | 5 | List, status changes, create, delete |
| Reviews CRUD | 5 | List, ratings, create, update, delete |
| Auth Security | 3 | Logout, refresh token invalidation |

### Expected Output (100% Pass)

```
🔬 Yandox CRM — Full E2E API Test Suite v2
   Base URL: http://localhost:4000/api
   Time: 2026-05-25T10:56:17.922Z

────────────────────────────────────────────────────────────────
📋 1. HEALTH CHECK
────────────────────────────────────────────────────────────────
  ✅ GET /health → 200 OK

────────────────────────────────────────────────────────────────
📋 2. AUTH LIFECYCLE
────────────────────────────────────────────────────────────────
  ✅ Valid format wrong password → 401
  ✅ Unknown email (valid format) → 401
  ✅ Admin login OK → Admin User (role: admin)
  ✅ Protected /customers without token → 401
  ✅ Protected /leads without token → 401
  ✅ GET /auth/me → admin profile confirmed
  ✅ POST /auth/refresh → new access token + refresh token acquired
  ✅ PUT /auth/me → profile update OK
  ✅ Agent login OK
  ✅ Tampered JWT → 401 (secure)
  ...
════════════════════════════════════════════════════════════════
📊 E2E RESULTS: 68/68 tests passed (100.0%)
✅ ALL TESTS PASSED — PRODUCTION READY
════════════════════════════════════════════════════════════════
```

---

## 3. 🔍 TypeScript Compilation Tests

### Frontend TypeScript Check

```bash
# From project root (yandox-crm-source/)
npm run typecheck

# Zero output = Zero TypeScript errors ✅
# Any output = TypeScript errors found ❌
```

### Backend TypeScript Check

```bash
# From backend/ directory
cd backend
npm run build

# Successful output:
# > property-crm-backend@0.1.0 build
# > tsc -p tsconfig.json
# (no error messages)
```

### Full Production Build Test

```bash
# Frontend production build
npm run build

# Expected output:
# ✓ built in ~8s
# dist/client/assets/...
```

---

## 4. 🔐 Manual Auth Testing

### Test 1: Login Flow

1. Open http://localhost:5173
2. You should be redirected to `/login`
3. Enter: `admin@yandoxcrm.com` / `Admin@123`
4. Click Sign In
5. ✅ Should redirect to Dashboard

### Test 2: Wrong Password

1. Go to http://localhost:5173/login
2. Enter: `admin@yandoxcrm.com` / `wrongpassword`
3. ✅ Should show error message "Invalid email or password"
4. ✅ Should NOT redirect

### Test 3: Token Persistence

1. Login with admin account
2. Close the browser tab
3. Open http://localhost:5173 in a new tab
4. ✅ Should auto-login (not show login page)

### Test 4: Logout

1. Login and navigate to any page
2. Click the user avatar in the top-right corner
3. Click Logout
4. ✅ Should redirect to `/login`
5. ✅ Trying to access a protected page should redirect to `/login`

### Test 5: Role-Based Access

1. Login as `agent@yandoxcrm.com` / `Agent@123`
2. Try to navigate to `/analytics`
3. ✅ Should show "Unauthorized" page (agents cannot access analytics)
4. Try to navigate to `/settings`
5. ✅ Should show "Unauthorized" page

---

## 5. 🏘️ Properties Module Testing

### Create a Property

1. Login as admin
2. Navigate to `/property`
3. Click **"Add Property"** button (top-right)
4. Fill in all required fields:
   - Title: "Test Luxury Apartment"
   - Description: "Beautiful test property"
   - Price: 500000
   - City: "Mumbai"
   - State: "MH"
   - Address: "123 Test Street"
   - Property Type: APARTMENT
   - BHK: 3
   - Bathrooms: 2
   - Area: "1500 sqft"
5. Click Create
6. ✅ Should appear in the properties list
7. ✅ Toast message: "Property created successfully"

### Edit a Property

1. Find a property in the list
2. Click the Edit (✏️) button
3. Change the price
4. Click Save Changes
5. ✅ Updated price should show in list
6. ✅ Toast message: "Property updated successfully"

### Delete a Property

1. Find a test property in the list
2. Click the Delete (🗑️) button
3. Confirm the dialog
4. ✅ Property removed from list
5. ✅ Toast message: "Property deleted"

### Search Properties

1. Type "Bay" in the search bar
2. ✅ Should filter to properties matching "Bay"
3. Clear the search
4. ✅ All properties should return

### Filter by Status

1. Select "For Sale" from status dropdown
2. ✅ Only "FOR_SALE" properties shown
3. Select "All" to reset

---

## 6. 👥 Customers Module Testing

### Create a Customer

1. Navigate to `/customers`
2. Click **"Add Customer"**
3. Fill in:
   - Name: "John Test"
   - Email: "john.test@example.com" ← Must be unique
   - Phone: "+1-555-9999"
   - Budget: 750000
4. Click Create Customer
5. ✅ Appears in customer list

### Duplicate Email Test

1. Try creating another customer with the same email
2. ✅ Should show "A record with this email already exists." error

### Search Customers

1. Type a customer name in the search bar
2. ✅ List filters in real-time

---

## 7. 📈 Leads Pipeline Testing

### Create a Lead

1. Navigate to `/leads`
2. Click **"Add Lead"**
3. Select a Customer from dropdown (shows names, not UUIDs)
4. Select a Property from dropdown (shows titles, not UUIDs)
5. Set Status: NEW
6. Set Source: Website
7. Click Create
8. ✅ Lead appears in list with customer name and property title

### Move Lead Through Pipeline

1. Find a lead
2. Click Edit (✏️)
3. Change Status to CONTACTED
4. Click Save
5. ✅ Status badge changes color
6. Repeat for QUALIFIED → WON
7. ✅ Entire pipeline can be traversed

---

## 8. 💬 Messages / Conversations Testing

### Send a Message

1. Navigate to `/messages`
2. Click a conversation in the left panel
3. In the reply box, type: "Are you interested in viewing the property?"
4. Click Send
5. ✅ Message appears in thread

### Send with AI Response

1. In the reply box, type a customer query
2. Toggle ON "Send with AI Response"
3. Click Send
4. ✅ Customer message appears
5. ✅ AI agent reply appears automatically below

---

## 9. 📅 Calendar / Appointments Testing

### Create an Appointment

1. Navigate to `/calendar`
2. Click **"Schedule Appointment"**
3. Select Customer, Property, Date/Time
4. Set Status: SCHEDULED
5. Click Create
6. ✅ Appointment appears grouped by date

### Update Appointment Status

1. Find an appointment card
2. Use the status dropdown (inline update)
3. Change to CONFIRMED
4. ✅ Badge color changes instantly
5. ✅ Toast: "Appointment updated"

---

## 10. ⭐ Reviews Module Testing

### Add a Review

1. Navigate to `/reviews`
2. Click **"Add Review"**
3. Select a Customer
4. Enter Reviewer Name
5. Click stars to set rating (try 5 stars)
6. Enter a comment
7. Click Add Review
8. ✅ Review appears in list
9. ✅ Average rating updates at top

---

## 11. ⚙️ Settings Testing

### Update Profile

1. Login as admin
2. Navigate to `/settings`
3. Ensure "Profile" tab is selected
4. Change Name to "Admin Updated"
5. Click Save Profile
6. ✅ Toast: "Profile updated successfully"
7. Refresh page → ✅ Name persists

### Change Password

1. Navigate to Settings → Security tab
2. Enter new password (min 8 chars)
3. Confirm password
4. ✅ Password strength indicator appears
5. Click Update Password
6. ✅ Toast: "Password changed successfully"
7. Logout and try logging in with new password

---

## 12. 🗄️ Database Testing

### View Database in Prisma Studio

```bash
cd backend
npx prisma studio
# Opens at http://localhost:5555
```

In Prisma Studio you can:
- Browse all tables (User, Property, Customer, Lead, etc.)
- View all records
- Edit records directly
- Add/delete records

### Verify Seed Data

```bash
cd backend

# Check record counts after seeding
npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log('Users:', await prisma.user.count());
  console.log('Properties:', await prisma.property.count());
  console.log('Customers:', await prisma.customer.count());
  console.log('Leads:', await prisma.lead.count());
  console.log('Conversations:', await prisma.conversation.count());
  console.log('Reviews:', await prisma.review.count());
  console.log('Appointments:', await prisma.appointment.count());
  await prisma.\$disconnect();
}
main();
"
```

Expected counts after seeding:
| Table | Expected Count |
|-------|---------------|
| User | 4 |
| Agent | 3 |
| Property | 8 |
| Customer | 6 |
| Lead | 7 |
| Conversation | 4 |
| Review | 5 |
| Appointment | 6 |

---

## 13. 🔒 Security Testing

### Test 1: Access Protected Route Without Token

```bash
curl http://localhost:4000/api/customers
# Expected: 401 Unauthorized
```

### Test 2: Use Invalid/Tampered Token

```bash
curl -H "Authorization: Bearer invalid.jwt.token" \
     http://localhost:4000/api/customers
# Expected: 401 Unauthorized
```

### Test 3: Duplicate Email Guard

```bash
# First request — succeeds
curl -X POST http://localhost:4000/api/customers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"dup@test.com","phone":"555-0000"}'

# Second request — should return 409
curl -X POST http://localhost:4000/api/customers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Dup","email":"dup@test.com","phone":"555-0001"}'
# Expected: 409 Conflict
```

### Test 4: Refresh Token Invalidation

```bash
# 1. Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@yandoxcrm.com","password":"Agent@123"}'
# Save refreshToken from response

# 2. Logout (use access token)
curl -X POST http://localhost:4000/api/auth/logout \
  -H "Authorization: Bearer ACCESS_TOKEN"

# 3. Try to refresh — should fail
curl -X POST http://localhost:4000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"SAVED_REFRESH_TOKEN"}'
# Expected: 401 - Refresh token is invalid or expired
```

---

## 14. 📊 Performance Testing

### Check API Response Times

The backend logs all request times via Morgan:

```
GET /api/properties 200 3.181 ms
GET /api/dashboard/summary 200 33.846 ms
POST /api/auth/login 200 64.764 ms  ← bcrypt is slow by design
```

**Expected response times:**
| Endpoint | Expected |
|----------|----------|
| Health | < 5ms |
| List endpoints | < 10ms |
| Dashboard summary | < 50ms |
| Login (bcrypt) | 60-80ms |
| Create operations | < 15ms |

---

## 15. ✅ Complete Test Checklist

Use this checklist before any release or deployment:

```
PRE-DEPLOYMENT CHECKLIST
═══════════════════════════════════════════════════════

  BUILD CHECKS
  [ ] npm run typecheck → 0 errors
  [ ] cd backend && npm run build → 0 errors
  [ ] npm run build → Production bundle created

  DATABASE
  [ ] npx prisma generate → Client generated
  [ ] npx prisma migrate dev → Migrations applied
  [ ] npx tsx prisma/seed.ts → Demo data seeded

  AUTOMATED TESTS
  [ ] node api-tests.mjs → 68/68 passed (100%)

  MANUAL AUTH TESTS
  [ ] Admin login works (admin@yandoxcrm.com / Admin@123)
  [ ] Manager login works (manager@yandoxcrm.com / Manager@123)
  [ ] Agent login works (agent@yandoxcrm.com / Agent@123)
  [ ] Wrong password shows error
  [ ] Logout clears session
  [ ] Protected routes redirect to /login

  MANUAL MODULE TESTS
  [ ] Dashboard loads with charts
  [ ] Properties list loads and search works
  [ ] Create new property → appears in list
  [ ] Customer list loads
  [ ] Create new customer → appears in list
  [ ] Leads pipeline shows colored statuses
  [ ] Lead status can be updated
  [ ] Conversations load with customer names
  [ ] AI response generates on message send
  [ ] Appointments show grouped by date
  [ ] Reviews show star ratings
  [ ] Analytics charts render correctly
  [ ] Settings tabs all function

  SECURITY
  [ ] /api/customers without token → 401
  [ ] Tampered JWT → 401
  [ ] Duplicate email → 409
  [ ] RT after logout → 401

═══════════════════════════════════════════════════════
```
