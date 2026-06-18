# Yandox Property CRM

![Yandox Property CRM](https://via.placeholder.com/1200x300?text=Yandox+Property+CRM)

Yandox Property CRM is a production-grade, highly scalable real estate customer relationship management system. It features advanced lead tracking, appointment scheduling, property management, and an integrated AI-powered WhatsApp automation bot (OpenClaw) capable of semantic reasoning and natural language conversation.

## 🏗️ Architecture

The system is built on a modern, decoupled, and distributed stack:

- **Frontend:** React + Vite, TailwindCSS, TanStack Query, ShadCN UI
- **Backend API:** Node.js + Express.js + TypeScript
- **Database:** PostgreSQL managed via Prisma ORM
- **Messaging & Queues:** BullMQ + Redis for resilient, asynchronous job processing
- **AI Engine:** OpenClaw Agent powered by Ollama (Qwen3:8B)
- **External Integrations:** Meta WhatsApp Cloud API

### Data Flow
Incoming WhatsApp messages hit the Express API via Meta webhooks, are instantly verified and persisted to Postgres, then pushed to BullMQ/Redis. A dedicated worker process consumes the queue, invokes the OpenClaw AI agent (which loads contextual memory and invokes Ollama), and finally sends an intelligent reply back via the Meta API.

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v20+)
- PostgreSQL (v15+)
- Redis Server (v7+)
- Ollama (running locally or on a remote DGX/cluster)

### 1. Environment Variables

1. Copy `.env.example` to `.env` in the root directory.
2. Copy `backend/.env.example` to `backend/.env`.
3. Update the `.env` variables with your actual credentials.

**Backend `.env` Configuration:**
```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/propertycrm
REDIS_URL=redis://localhost:6379

JWT_ACCESS_TOKEN_SECRET=your_secure_secret_here
JWT_REFRESH_TOKEN_SECRET=your_secure_secret_here

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:latest

META_WA_ACCESS_TOKEN=your_meta_token
META_WA_PHONE_NUMBER_ID=your_phone_id
META_WA_VERIFY_TOKEN=your_verify_token
META_APP_SECRET=your_app_secret
```

### 2. PostgreSQL Setup
Ensure your PostgreSQL server is running. Create a new database (`propertycrm`).
Run the Prisma migrations to generate the schema:

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### 3. Redis Setup
Ensure Redis is running on the default port `6379` (or update `REDIS_URL` in `.env`). Redis is mandatory for BullMQ worker queues and distributed rate limiting.

### 4. Ollama Setup
Install Ollama and pull the required model:
```bash
ollama pull qwen3:latest
ollama serve
```
Ensure `OLLAMA_BASE_URL` points to your running Ollama instance.

### 5. WhatsApp Cloud API Setup
1. Create an app in the Meta Developer Dashboard.
2. Add the WhatsApp product.
3. Configure your Webhook URL to point to `https://your-domain.com/api/whatsapp/webhook`.
4. Subscribe to the `messages` event.
5. Provide your `META_WA_VERIFY_TOKEN` during setup.

## 🏃 Running the Application

### API Startup (Terminal 1)
Starts the primary Express API server.
```bash
cd backend
npm install
npm run dev
```

### Worker Startup (Terminal 2)
Starts the BullMQ asynchronous worker process for WhatsApp messages and AI generation.
```bash
cd backend
npm run worker
```

### Frontend Startup (Terminal 3)
Starts the Vite development server.
```bash
npm install
npm run dev
```

## 🌍 Production Deployment

For production, the application should be built and served using a process manager like PM2 or deployed via Docker containers.

1. **Build the Backend:**
   ```bash
   cd backend
   npm run build
   ```
2. **Build the Frontend:**
   ```bash
   npm run build
   ```
3. **Start Production Services:**
   ```bash
   NODE_ENV=production pm2 start dist/server.js --name "yandox-api"
   NODE_ENV=production pm2 start dist/worker.js --name "yandox-worker"
   ```
4. **Reverse Proxy:** Use Nginx or Caddy to route `/api` to the Node server and serve the static files from `/dist`. Ensure SSL/TLS is configured for Meta Webhooks to function.
