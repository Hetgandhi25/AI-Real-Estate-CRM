import dotenv from "dotenv";
import { createServer } from "http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { initSocketIO } from "./socket.js";
import { startWhatsApp } from "./modules/whatsapp/whatsapp.service.js";

dotenv.config();

const port = env.PORT;
const server = createServer(app);

// Initialize Socket.IO
initSocketIO(server);

// Start WhatsApp Bot Service
startWhatsApp().catch((err) => {
  console.error("❌ Failed to start WhatsApp Bot service:", err);
});

server.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
