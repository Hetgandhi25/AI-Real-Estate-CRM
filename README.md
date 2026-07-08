<div align="center">
  <h1>Property Property CRM & AI OpenClaw</h1>
  <p><strong>A production-grade, highly scalable AI-powered Real Estate CRM featuring advanced lead tracking, appointment scheduling, and an integrated WhatsApp automation bot with semantic reasoning.</strong></p>
</div>

---

## 📖 Table of Contents
- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Request Flow](#request-flow)
- [Folder Structure](#folder-structure)
- [Database Overview](#database-overview)
- [API Documentation](#api-documentation)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Deployment Guide](#deployment-guide)
- [Usage Examples](#usage-examples)
- [Security](#security)
- [Scalability & Performance](#scalability--performance)
- [Future Roadmap](#future-roadmap)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

---

## 🎯 Project Overview

Property Property CRM is a comprehensive Customer Relationship Management (CRM) platform purpose-built for the real estate industry. It streamlines property listings, lead management, and agent-customer interactions. 

Its standout feature is **OpenClaw**, an integrated AI-powered WhatsApp bot. Built on top of local LLMs (Ollama/Qwen3), OpenClaw handles incoming WhatsApp inquiries, understands real estate context, schedules appointments, and autonomously converses with potential buyers, routing complex queries to human agents when necessary.

---

## ✨ Features

- **Automated WhatsApp AI (OpenClaw):** 24/7 conversational AI agent answering property inquiries via Meta Cloud API.
- **Property Management:** Complete CRUD for real estate listings, including location hierarchies (State -> City -> Area).
- **Lead & Customer Tracking:** End-to-end lifecycle tracking from new inquiry to closed deal.
- **Appointment Scheduling:** Automated scheduling between agents and customers.
- **Agent Dashboard:** Real-time metrics, analytics, and lead assignments.
- **Resilient Background Processing:** BullMQ & Redis queues ensure no webhook or AI generation request is lost during traffic spikes.
- **Role-Based Access Control:** Distinct views and permissions for Admin and Agents.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19 + Vite
- **Routing & State:** TanStack Router, TanStack Query
- **Styling:** Tailwind CSS 4, Radix UI, ShadCN UI
- **Forms & Validation:** React Hook Form, Zod

### Backend
- **Server:** Node.js, Express.js, TypeScript
- **Database:** PostgreSQL (managed via Prisma ORM)
- **Queues & Caching:** Redis, BullMQ
- **AI Engine:** Ollama (Qwen3:8B or similar)
- **External APIs:** Meta WhatsApp Cloud API

---

## 🏗️ System Architecture & Message Flow

The system architecture is designed for zero data loss, exact chronological processing, and high resilience, specifically tailored to handle asynchronous WhatsApp messaging and computationally heavy AI inferences.

### Detailed Architecture Diagram

```mermaid
graph TD
    %% External Entities
    Customer((WhatsApp User))
    MetaAPI[Meta WhatsApp Cloud API]
    
    %% Ingress & API Server
    subgraph Express Backend API
        DMZ[DMZ / Ingress]
        SigValidator[Meta Signature Validator]
        REST[REST API]
        WebhookHandler[Webhooks]
    end
    
    %% Storage & Queues
    subgraph Distributed Data Layer
        DB[(PostgreSQL / Prisma)]
        Redis[(Redis)]
    end
    
    %% Workers
    subgraph Asynchronous Workers
        BullMQ[BullMQ Job Worker]
        Lock(Distributed Redis Lock)
        Drainer(DB-Queue Drainer Loop)
        Dispatch(Dispatch Outbound)
    end
    
    %% AI Infrastructure
    subgraph AI Inference Infrastructure
        OpenClaw[OpenClaw Agent Orchestrator]
        CircuitBreaker{Circuit Breaker}
        DGX[DGX Spark GPU Infrastructure<br/>Ollama LLM Engine]
    end
    
    %% Front End
    Portal[Admin Portal<br/>React + Vite]
    
    %% Connections
    Customer <--> MetaAPI
    MetaAPI -->|Webhook Payload| DMZ
    DMZ --> SigValidator
    SigValidator --> WebhookHandler
    
    WebhookHandler -->|1. Write Event| DB
    WebhookHandler -->|2. Enqueue Trigger| Redis
    
    Redis -->|3. Poll Received Events| BullMQ
    BullMQ -->|4. Attempt Acquire| Lock
    Lock -->|5. Lock Acquired| Drainer
    Drainer <-->|Fetch DB State| DB
    
    Drainer -->|6. Text + Context| OpenClaw
    OpenClaw -->|7. Safeguarded Request| CircuitBreaker
    CircuitBreaker -->|8. Inference Call| DGX
    DGX -->|9. AI Response| CircuitBreaker
    CircuitBreaker --> OpenClaw
    
    OpenClaw -->|10. Update Outbound Ledger| DB
    OpenClaw --> Dispatch
    Dispatch -->|11. Send Webhooks| MetaAPI
    
    REST <--> DB
    Portal <--> REST
```

---

## 🔄 The Journey of a Single Message

1. **Front Door**: Customer messages on WhatsApp; Meta sends an instant webhook to our Express Backend.
2. **Authenticity Check**: The `Meta Signature Validator` cryptographically verifies the SHA-256 HMAC signature.
3. **Permanent Record**: The message is saved to PostgreSQL (`RECEIVED` status). Duplicates are rejected at the DB level.
4. **Task Queuing**: A lightweight task is placed in BullMQ (Redis), and an instant HTTP 200 OK is returned to Meta to prevent timeout retries.
5. **Distributed Locking**: A background worker acquires a temporary Redis lock for the customer's phone number, ensuring only one worker generates an AI reply for that customer at a time.
6. **Strict Ordering**: The `DB-Queue Drainer` ensures messages are processed sequentially based on DB timestamps.
7. **AI Orchestration**: The `OpenClaw` orchestrator builds the context (chat history, property DB lookups) and queries the AI model.
8. **Resilience**: The query passes through a `Circuit Breaker` that protects the system from DGX Spark/Ollama outages.
9. **Outbound Ledger**: Before sending, a `PENDING` record is written to the Outbound Ledger in Postgres.
10. **Delivery**: The reply is sent to the Meta WhatsApp Cloud API.
11. **Confirmation**: Meta responds with a message ID (`wamid`), updating the ledger to `SENT`. The Redis lock is released.
12. **Read Receipts**: Subsequent webhooks update the ledger sequentially to `DELIVERED` then `READ`.

---

## 📂 Folder Structure

```text
├── backend/                  # Backend Node.js codebase
│   ├── prisma/               # Prisma schema & migrations
│   ├── scripts/              # Validation, mocking, and utility scripts
│   └── src/
│       ├── modules/          # Domain-driven feature modules (auth, ai-bot, leads, etc.)
│       ├── routes/           # Global Express router registration
│       ├── services/         # Shared business logic and integrations
│       ├── server.ts         # Main API server entry point
│       └── worker.ts         # BullMQ background worker entry point
├── src/                      # Frontend React codebase
│   ├── components/           # Reusable UI components (ShadCN, Radix)
│   ├── features/             # Feature-specific components and logic
│   ├── routes/               # TanStack Router page definitions
│   ├── services/             # API client calls (Axios/TanStack Query)
│   └── store/                # Global state management
├── alternative-implementations-n8n/ # Alternative n8n workflows
└── scripts/                  # Global utilities
```

---

## 🗄️ Database Overview

The system uses **PostgreSQL** structured via Prisma. Core entities include:
- `User` & `Agent`: Authentication and agent profiling.
- `Property`, `State`, `City`, `Area`: Real estate listings and location mapping.
- `Customer`, `Lead`, `Appointment`: CRM tracking and scheduling.
- `Conversation`, `Message`, `AISession`: WhatsApp AI chat history and session context.
- `WebhookEvent`, `OutboundMessage`: Resilient logging of Meta API interactions.

---

## 🔌 API Documentation

The REST API exposes the following primary endpoints under `/api`:
- `/auth` - Login, registration, JWT token generation.
- `/properties` - CRUD operations for real estate listings.
- `/leads` - Lead tracking and status updates.
- `/customers` - Customer data management.
- `/dashboard` - Analytical metrics for the frontend UI.
- `/appointments` - Scheduling between agents and customers.
- `/conversations` & `/reviews` - Chat history and feedback.
- `/whatsapp/webhook` - Endpoint for Meta WhatsApp API integration.
- `/ai-bot` - Internal endpoints for AI session management.

*For detailed interactive documentation, run the server and navigate to the integrated Swagger/Postman collection (if configured).*

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v20+)
- PostgreSQL (v15+)
- Redis Server (v7+)
- Ollama (running locally or on a remote machine)

### 1. Database & Backend Setup
```bash
cd backend
npm install
# Setup Prisma
npx prisma migrate dev --name init
npx prisma generate
```

### 2. Frontend Setup
```bash
# In the root directory
npm install
```

### 3. Ollama Setup
Install Ollama and pull the required model (ensure it matches your `.env`):
```bash
ollama pull qwen3:latest
ollama serve
```

---

## 🔐 Environment Variables

Create `.env` files in both the **root** (for frontend) and **backend/** directories.

**backend/.env**
```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/propertycrm
REDIS_URL=redis://localhost:6379

JWT_ACCESS_TOKEN_SECRET=your_secure_secret_here
JWT_REFRESH_TOKEN_SECRET=your_secure_secret_here

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:latest

# Meta WhatsApp Cloud API
META_WA_ACCESS_TOKEN=your_meta_token
META_WA_PHONE_NUMBER_ID=your_phone_id
META_WA_VERIFY_TOKEN=your_verify_token
META_APP_SECRET=your_app_secret
```

---

## 🌍 Deployment Guide

1. **Build the Applications:**
   ```bash
   # Build Frontend (Root)
   npm run build
   
   # Build Backend
   cd backend && npm run build
   ```

2. **Start Production Services (Using PM2):**
   ```bash
   NODE_ENV=production pm2 start dist/server.js --name "property-api"
   NODE_ENV=production pm2 start dist/worker.js --name "property-worker"
   ```

3. **Docker (Optional):** Use the included `docker-compose.yml` to spin up Redis and PostgreSQL quickly.
   ```bash
   docker-compose up -d
   ```

4. **Reverse Proxy:** Configure Nginx/Caddy to serve frontend static files from `dist/` and proxy `/api` requests to `localhost:4000`. SSL/TLS is strictly required by Meta for webhooks.

---

## 💡 Usage Examples

### Testing WhatsApp Integration locally
You can use the provided backend scripts to simulate webhook events without needing a live Meta connection:
```bash
cd backend
npm run build
node dist/scripts/test-whatsapp-integration.js
```
This pushes mock webhook events into the Redis queue, allowing you to test the AI worker's response generation.

---

## 🛡️ Security

- **Authentication:** Stateless JWT (JSON Web Tokens) for API access.
- **Data Integrity:** Meta webhook signatures are verified using `META_APP_SECRET` to ensure authenticity.
- **Helmet:** HTTP header security configurations are enabled.
- **Queue Security:** BullMQ dashboard is protected via Basic Auth.

---

## 📈 Scalability & Performance

- **Decoupled Workers:** AI generation can take 2-10 seconds. Webhooks are immediately acknowledged (200 OK) and offloaded to BullMQ workers to prevent API timeouts.
- **Connection Pooling:** Prisma utilizes connection pooling for optimal database performance.
- **Horizontal Scaling:** The stateless worker nodes can be scaled horizontally to handle high WhatsApp message throughput.

---

## 🔮 Future Roadmap

- [ ] **Multi-Tenancy:** Allow multiple real estate agencies to use the same deployment with isolated data.
- [ ] **Multi-Modal AI:** Enable OpenClaw to analyze incoming images of properties.
- [ ] **Email Integration:** Sync AI-generated email drips for lead nurturing.
- [ ] **Voice Calls:** Integrate AI voice calling for automated follow-ups.

---

## 📚 Documentation

For deeper technical dives, please refer to our internal documentation files:
- [Features Overview](FEATURES_OVERVIEW.md)
- [System Architecture](system_architecture.md)
- [Project Setup Guide](PROJECT_SETUP.md)
- [Running the System](RUN_SYSTEM.md)
- [Testing Guide](TESTING_GUIDE.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)

---

## 🤝 Contributing

Contributions are welcome! Please follow standard pull request workflows:
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## ✍️ Author

**Het Gandhi**  
- GitHub: [@Hetgandhi25](https://github.com/Hetgandhi25)
