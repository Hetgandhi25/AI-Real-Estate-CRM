import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { env } from "./config/env.js";

let io: SocketIOServer | null = null;

export function initSocketIO(server: HTTPServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: env.NODE_ENV === "production" ? env.CORS_ORIGIN : true,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Client connected to Socket.IO: ${socket.id}`);

    socket.on("conversation:updated", (data) => {
      console.log(`🔌 Received conversation:updated from socket client:`, data);
      socket.broadcast.emit("conversation:updated", data);
    });

    socket.on("disconnect", (reason) => {
      console.log(`🔌 Client disconnected from Socket.IO: ${socket.id} (${reason})`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.IO has not been initialized!");
  }
  return io;
}

export function broadcastConversationUpdate(conversationId: string, customerId: string) {
  if (io) {
    console.log(`📡 Broadcasting conversation:updated for ID: ${conversationId}`);
    io.emit("conversation:updated", { conversationId, customerId });
  }
}
