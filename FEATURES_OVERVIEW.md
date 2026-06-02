# 🏠 Yandox CRM — Features Overview

> Complete guide to every module, page, and feature in the Yandox Real Estate CRM.

---

## 🗺️ Application Navigation

```
http://localhost:5173/               → Dashboard (Overview)
http://localhost:5173/property       → Properties
http://localhost:5173/customers      → Customers
http://localhost:5173/agents         → Agents
http://localhost:5173/leads          → Leads Pipeline
http://localhost:5173/messages       → Conversations
http://localhost:5173/ai-bot         → AI Assistant
http://localhost:5173/analytics      → Analytics Center
http://localhost:5173/calendar       → Appointments / Calendar
http://localhost:5173/reviews        → Reviews
http://localhost:5173/settings       → Settings
http://localhost:5173/login          → Login Page
```

---

## 1. 🔐 Authentication Module

### Login Page (`/login`)

**Features:**
- Email + password login form
- Real-time validation (email format, password minimum 8 chars)
- Loading state during authentication
- Error messages for wrong credentials (401 Unauthorized)
- Automatic redirect to Dashboard on success
- "Remember me" via localStorage token persistence

**Auth Flow:**
```
User enters credentials
    ↓
POST /api/auth/login
    ↓
Backend validates password with bcrypt
    ↓
Issues Access Token (15min) + Refresh Token (7 days)
    ↓
Tokens stored in localStorage
    ↓
User redirected to /dashboard
```

**Token Refresh Flow:**
- Access tokens expire after 15 minutes
- Axios interceptors automatically call `POST /api/auth/refresh`
- If refresh succeeds → new tokens stored, request retried
- If refresh fails → user logged out, redirected to `/login`

---

## 2. 📊 Dashboard Module (`/`)

The Dashboard is the **overview hub** — quick KPIs and high-level metrics.

### KPI Cards (8 metrics)
| Metric | Description |
|--------|-------------|
| Total Properties | Count of all property listings |
| Active Customers | Number of customer records |
| Total Leads | All leads across pipeline stages |
| Appointments Today | Meetings scheduled for today |
| Total Revenue | Sum of won lead values |
| Conversion Rate | Won leads / Total leads % |
| Active Agents | Number of agent profiles |
| Pending Reviews | Reviews awaiting response |

### Charts & Visualizations
- **Revenue Trend** — 6-month line chart showing monthly revenue
- **Customer Growth** — Bar chart of new customers per month
- **Property Type Distribution** — Pie chart (Apartment, Villa, Studio, etc.)
- **Top Agents** — Ranked list with performance scores
- **Lead Referral Sources** — Where leads come from (Website, Referral, Social, etc.)

### Data Refresh
- Dashboard data refreshes every 5 minutes automatically
- Manual refresh via browser F5

---

## 3. 🏘️ Properties Module (`/property`)

Full property listing management with search and filtering.

### Property List View
- **Search bar** — filter by title, city, or description
- **Status filter** — All, For Sale, For Rent, Sold
- **Type filter** — Apartment, Villa, Studio, Penthouse, Office, Hotel, Loft
- **Grid layout** — property cards with image, price, location
- **Pagination** — 50 per page

### Property Card Shows:
- Property image (first image)
- Title and address
- Price (formatted as currency)
- Property type badge (color-coded)
- Status badge (For Sale / For Rent / Sold)
- BHK and bathroom count
- Area (sqft)
- Featured flag ⭐
- Edit / Delete action buttons

### Add/Edit Property Modal
| Field | Type | Required |
|-------|------|----------|
| Title | Text | ✅ |
| Description | Textarea | ✅ |
| Price | Number | ✅ |
| City | Text | ✅ |
| State | Text | ✅ |
| Address | Text | ✅ |
| Property Type | Dropdown | ✅ |
| BHK (Bedrooms) | Number | ✅ |
| Bathrooms | Number | ✅ |
| Area (sqft) | Text | ✅ |
| Status | Dropdown | ✅ |
| Amenities | Multi-text | Optional |
| Images | URL list | Optional |
| Featured | Toggle | Optional |

### API Endpoints
```
GET    /api/properties          → List (paginated, filterable)
GET    /api/properties/:id      → Single property
POST   /api/properties          → Create (requires auth)
PUT    /api/properties/:id      → Update (requires auth)
DELETE /api/properties/:id      → Delete (requires auth)
```

---

## 4. 👥 Customers Module (`/customers`)

Complete customer relationship management.

### Customer List View
- **Search bar** — filter by name, email, phone, or location
- Sorted by most recently added
- Paginated (50 per page)

### Customer Row Shows:
- Full name + budget
- Email address
- Phone number
- Preferred location
- Edit / Delete buttons

### Add/Edit Customer Modal
| Field | Type | Required |
|-------|------|----------|
| Name | Text | ✅ |
| Email | Email | ✅ (unique) |
| Phone | Text | ✅ |
| Budget | Number (USD) | Optional |
| Preferred Location | Text | Optional |
| Notes | Textarea | Optional |

### Validation Rules
- Email must be unique (409 Conflict if duplicate)
- Email must be valid format
- Name, email, phone all required

### API Endpoints
```
GET    /api/customers           → List (paginated, searchable)
GET    /api/customers/:id       → Single customer
POST   /api/customers           → Create
PUT    /api/customers/:id       → Update
DELETE /api/customers/:id       → Delete
```

---

## 5. 📈 Leads Pipeline Module (`/leads`)

Visual sales pipeline tracking for property leads.

### Pipeline View
Color-coded status badges:
| Status | Color | Meaning |
|--------|-------|---------|
| `NEW` | Blue | Just entered the pipeline |
| `CONTACTED` | Yellow | Initial contact made |
| `QUALIFIED` | Purple | Lead is serious buyer |
| `WON` | Green | Deal closed successfully |
| `LOST` | Red | Lead did not convert |

### Lead Table Shows:
- Customer name (resolved from ID)
- Property title (resolved from ID)
- Lead source (Website, Referral, Cold Call, etc.)
- Current status (colored badge)
- Assigned agent
- Notes
- Edit / Delete actions

### Add/Edit Lead Modal
| Field | Type | Required |
|-------|------|----------|
| Customer | Dropdown (names) | ✅ |
| Property | Dropdown (titles) | ✅ |
| Status | Dropdown | ✅ |
| Source | Dropdown | ✅ |
| Assigned Agent | Dropdown (names) | Optional |
| Notes | Textarea | Optional |

> ✅ **No raw UUIDs** — all dropdowns show human-readable names

### Pipeline Status Updates
- Click Edit on any lead
- Change status dropdown
- Click Save → instantly updates in pipeline

### API Endpoints
```
GET    /api/leads               → List with customer & property joins
GET    /api/leads/:id           → Single lead
POST   /api/leads               → Create lead
PUT    /api/leads/:id           → Update status/notes/assignment
DELETE /api/leads/:id           → Remove lead
```

---

## 6. 👨‍💼 Agents Module (`/agents`)

Real estate agent profile management.

### Agent List View
- Sorted by **performance score** (highest first)
- Shows name, email, specialization, performance score
- Edit / Delete actions per row

### Add/Edit Agent Modal
| Field | Type | Required |
|-------|------|----------|
| Name | Text | ✅ |
| Email | Email | ✅ |
| Password | Password | ✅ (on create) |
| Experience (years) | Number | Optional |
| Specialization | Text | Optional |
| Performance Score | Number (0-100) | Optional |

> **Note:** Creating an agent also creates a User account so they can log in.

### API Endpoints
```
GET    /api/agents              → List all agents
GET    /api/agents/:id          → Single agent
POST   /api/agents              → Create agent + user account
PUT    /api/agents/:id          → Update agent profile
DELETE /api/agents/:id          → Delete agent
```

---

## 7. 💬 Messages / Conversations Module (`/messages`)

Two-panel conversation management system.

### Left Panel — Conversation List
- List of all customer conversation threads
- Shows customer name + avatar initials
- Last message preview
- Timestamp
- AI summary badge if available

### Right Panel — Thread View
- Full message history in chat bubble format
- Customer messages (left, colored)
- Agent messages (right, gray)
- Message timestamps
- **Reply text area** at bottom
- **Send with AI Response** toggle — auto-generates an intelligent reply

### AI Response System
When "Send with AI" is enabled:
- Customer message is sent first
- Backend generates a contextual AI response from a response library
- 15 possible response variations covering: scheduling, pricing, tours, documentation, etc.
- Response added to thread automatically

### Create New Conversation
- Select customer from dropdown
- Type initial message
- Click Create

### API Endpoints
```
GET    /api/conversations            → List all conversations
GET    /api/conversations/:id        → Single conversation with messages
POST   /api/conversations            → Create new conversation
POST   /api/conversations/:id/messages → Add message (+ optional AI reply)
DELETE /api/conversations/:id        → Delete conversation
```

---

## 8. 🤖 AI Bot Module (`/ai-bot`)

Dedicated AI assistant hub for real estate queries.

### Features
- **Chat interface** with message history
- **Quick prompt buttons** for common real estate queries:
  - "What properties are available in downtown?"
  - "How do I qualify a lead?"
  - "What's the best follow-up strategy?"
  - "Summarize this week's appointments"
  - And more...
- Intelligent response generation (structured mock AI)
- Conversation history within session
- Clear chat button

### AI Response Categories
The AI can respond to questions about:
- Property availability and pricing
- Lead qualification strategies
- Customer follow-up best practices
- Market insights and trends
- Appointment scheduling advice
- Documentation requirements

> **Architecture Note:** The AI is currently powered by a structured response library (mock AI). The architecture is production-ready to plug in OpenAI GPT-4 or any LLM API by replacing the `generateAiResponse()` function in `conversation.service.ts`.

---

## 9. 📅 Calendar / Appointments Module (`/calendar`)

Appointment scheduling and management.

### Calendar View
- Appointments grouped by date categories:
  - **Today**
  - **Tomorrow**
  - **This Week**
  - **Next Week**
  - **Later**
  - **Past**

### Appointment Card Shows:
- Customer name
- Property (if linked)
- Assigned agent
- Scheduled date & time (formatted)
- Status badge (color-coded)
- Notes
- Status dropdown (quick inline update)
- Delete button

### Status Colors
| Status | Color |
|--------|-------|
| SCHEDULED | Blue |
| CONFIRMED | Green |
| COMPLETED | Gray |
| CANCELLED | Red |

### Add Appointment Modal
| Field | Type | Required |
|-------|------|----------|
| Customer | Dropdown (names) | ✅ |
| Property | Dropdown (titles) | Optional |
| Assigned Agent | Dropdown (names) | Optional |
| Date & Time | DateTime picker | ✅ |
| Status | Dropdown | ✅ |
| Notes | Textarea | Optional |

### API Endpoints
```
GET    /api/appointments         → List all appointments
POST   /api/appointments         → Schedule appointment
PUT    /api/appointments/:id     → Update status/notes
DELETE /api/appointments/:id     → Cancel/delete
```

---

## 10. ⭐ Reviews Module (`/reviews`)

Customer review management with visual star ratings.

### Reviews Overview Panel
- **Average Rating** — large number display with star icons
- **Rating Distribution** bar chart:
  - 5★ / 4★ / 3★ / 2★ / 1★ with count and percentage bar

### Reviews Table Shows:
- Customer name + email
- Reviewer name
- Star rating (★★★★★ visual)
- Review comment (truncated)
- Edit / Delete actions

### Add/Edit Review Modal
- **Customer** — dropdown with customer names
- **Reviewer Name** — text field
- **Rating** — interactive star picker (click stars to rate)
- **Comment** — textarea

### Interactive Star Picker
- Hover over stars to preview rating
- Click to set rating
- Shows X/5 text next to stars

### API Endpoints
```
GET    /api/reviews              → List all reviews
POST   /api/reviews              → Add review
PUT    /api/reviews/:id          → Edit review
DELETE /api/reviews/:id          → Delete review
```

---

## 11. 📊 Analytics Center (`/analytics`)

Deep metrics and business intelligence dashboard.

### Lead Funnel Chart
- Horizontal bar chart showing lead counts per stage
- Stages: NEW → CONTACTED → QUALIFIED → WON → LOST
- Shows conversion drop-off at each stage

### Revenue Trend Chart
- Line chart over 6 months
- Shows monthly revenue from won leads

### Agent Performance Chart
- Bar chart comparing agents by performance score
- Shows: Agent name, score, deals closed

### Appointment Trends Chart
- Bar chart grouping appointments by status
- Shows: SCHEDULED, CONFIRMED, COMPLETED, CANCELLED counts

### Key Metrics Cards
- Total Revenue (6 months)
- Lead Conversion Rate
- Best Performing Agent
- Average Rating

### API Endpoints
```
GET    /api/dashboard/summary    → KPIs and overview data
GET    /api/dashboard/analytics  → Deep metrics for charts
```

---

## 12. ⚙️ Settings Module (`/settings`)

Account and preference management with 4 tabs.

### Tab 1: Profile
- Update display name
- Update email address
- Role shown (read-only)
- Save Profile button

### Tab 2: Security
- Change password form
- New password + confirm password
- **Password strength indicator:**
  - 🔴 Too short (< 8 chars)
  - 🟡 Fair (8-12 chars)
  - 🟢 Strong (12+ chars)

### Tab 3: Notifications
Toggle switches for:
- New Leads notifications
- Appointment reminders
- Review notifications
- Message notifications

### Tab 4: Appearance
- **Theme picker:** Dark (default), System, Light
- **Density:** Comfortable / Compact

### API Endpoints
```
GET    /api/auth/me              → Get current user profile
PUT    /api/auth/me              → Update name/email/password
```

---

## 🔄 Data Flow Architecture

```
User Action (Click/Form Submit)
         ↓
React Component (routes/*.tsx)
         ↓
TanStack Query Hook (hooks/queries/*.ts)
         ↓
Service Function (services/*.service.ts)
         ↓
API Client (api/apiClient.ts → Axios)
         ↓
Backend Express Route (backend/src/routes/*.ts)
         ↓
Request Validator (Zod schema)
         ↓
Auth Middleware (requireAuth)
         ↓
Controller (backend/src/controllers/*.ts)
         ↓
Service Layer (backend/src/services/*.ts)
         ↓
Prisma ORM (database query)
         ↓
SQLite Database
         ↓
Response (JSON envelope) back up the chain
         ↓
TanStack Query cache updated
         ↓
React re-renders with fresh data
```

---

## 🔑 Summary of All API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | Server health check |
| POST | `/api/auth/login` | No | Login |
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/refresh` | No | Refresh access token |
| POST | `/api/auth/logout` | Yes | Logout |
| GET | `/api/auth/me` | Yes | Get current user |
| PUT | `/api/auth/me` | Yes | Update profile |
| GET | `/api/properties` | No | List properties |
| GET | `/api/properties/:id` | No | Get property |
| POST | `/api/properties` | Yes | Create property |
| PUT | `/api/properties/:id` | Yes | Update property |
| DELETE | `/api/properties/:id` | Yes | Delete property |
| GET | `/api/customers` | Yes | List customers |
| POST | `/api/customers` | Yes | Create customer |
| PUT | `/api/customers/:id` | Yes | Update customer |
| DELETE | `/api/customers/:id` | Yes | Delete customer |
| GET | `/api/leads` | Yes | List leads (with joins) |
| POST | `/api/leads` | Yes | Create lead |
| PUT | `/api/leads/:id` | Yes | Update lead/status |
| DELETE | `/api/leads/:id` | Yes | Delete lead |
| GET | `/api/agents` | Yes | List agents |
| POST | `/api/agents` | Yes | Create agent |
| PUT | `/api/agents/:id` | Yes | Update agent |
| DELETE | `/api/agents/:id` | Yes | Delete agent |
| GET | `/api/conversations` | Yes | List conversations |
| POST | `/api/conversations` | Yes | Create conversation |
| POST | `/api/conversations/:id/messages` | Yes | Add message |
| DELETE | `/api/conversations/:id` | Yes | Delete conversation |
| GET | `/api/appointments` | Yes | List appointments |
| POST | `/api/appointments` | Yes | Create appointment |
| PUT | `/api/appointments/:id` | Yes | Update appointment |
| DELETE | `/api/appointments/:id` | Yes | Delete appointment |
| GET | `/api/reviews` | Yes | List reviews |
| POST | `/api/reviews` | Yes | Create review |
| PUT | `/api/reviews/:id` | Yes | Update review |
| DELETE | `/api/reviews/:id` | Yes | Delete review |
| GET | `/api/dashboard/summary` | Yes | Dashboard KPIs |
| GET | `/api/dashboard/analytics` | Yes | Analytics data |
