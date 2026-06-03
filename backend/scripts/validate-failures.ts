import axios from "axios";
import jwt from "jsonwebtoken";
import { env } from "../src/config/env.js";
import { prisma } from "../src/prisma/index.js";
import { runOpenClawAgent } from "../src/modules/whatsapp/openclaw.agent.js";
import { PrismaClient } from "@prisma/client";

const BASE_URL = "http://localhost:4000/api";
const JWT_SECRET = env.JWT_SECRET || "default-secret-key-change-in-prod";

async function runFailureTesting() {
  console.log("==================================================");
  console.log("💥 PHASE 6 — FAILURE & RESILIENCE TESTING");
  console.log("==================================================");

  let issuesFound = 0;

  // 1. Invalid JWT test
  console.log("\nTEST 1: Requesting with invalid/malformed JWT...");
  try {
    await axios.get(`${BASE_URL}/ai-bot/summary`, {
      headers: { Authorization: "Bearer malformed.token.here" }
    });
    console.log("❌ Fail: Malformed token accepted!");
    issuesFound++;
  } catch (err: any) {
    console.log(`✅ Passed: Received expected status ${err.response?.status} (${err.response?.data?.message})`);
  }

  // 2. Expired JWT test
  console.log("\nTEST 2: Requesting with expired JWT...");
  try {
    const expiredToken = jwt.sign(
      { id: "dummy-id", email: "dummy@gmail.com", role: "admin" },
      JWT_SECRET,
      { expiresIn: "-1s" } // Expired 1 second ago
    );
    await axios.get(`${BASE_URL}/ai-bot/summary`, {
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    console.log("❌ Fail: Expired token accepted!");
    issuesFound++;
  } catch (err: any) {
    console.log(`✅ Passed: Received expected status ${err.response?.status} (${err.response?.data?.message})`);
  }

  // 3. Missing/Unauthorized Role Permissions (403 Forbidden)
  console.log("\nTEST 3: Requesting with unauthorized user role (e.g. manager)...");
  // Let's log in as manager
  try {
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: "manager@yandoxcrm.com",
      password: "Manager@123"
    });
    const managerToken = loginRes.data?.data?.accessToken;
    
    await axios.get(`${BASE_URL}/ai-bot/summary`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    console.log("❌ Fail: Manager role was allowed to access AI Bot endpoints! (Expected 403 Forbidden)");
    issuesFound++;
  } catch (err: any) {
    if (err.response?.status === 403) {
      console.log(`✅ Passed: Received expected status 403 Forbidden (${err.response?.data?.message})`);
    } else {
      console.log(`❌ Unexpected response: Status ${err.response?.status || err.message}`);
      issuesFound++;
    }
  }

  // 4. PostgreSQL Connection Failure
  console.log("\nTEST 4: Simulating PostgreSQL connection failure...");
  const badPrisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres:wrong_password@localhost:9999/non_existent_db?connect_timeout=1"
      }
    }
  });

  try {
    await badPrisma.user.findFirst();
    console.log("❌ Fail: Query succeeded despite invalid database configurations!");
    issuesFound++;
  } catch (err: any) {
    console.log(`✅ Passed: Database query threw connection error as expected: ${err.message.split("\n")[0]}`);
  } finally {
    await badPrisma.$disconnect();
  }

  // 5. Ollama Unavailable Fallback
  console.log("\nTEST 5: Verifying Ollama unavailable fallback mechanism...");
  try {
    const reply = await runOpenClawAgent({
      phone: "919999999999",
      pushName: "Failure Tester",
      userMessage: "Check for 2 bhk flat in Gota"
    });
    if (reply && reply.includes("Graceful Fallback Mode")) {
      console.log("✅ Passed: System degraded gracefully and fallback responses were returned.");
    } else {
      console.log("❌ Fail: Fallback response did not contain expected text.");
      issuesFound++;
    }
  } catch (err: any) {
    console.log(`❌ Fail: Agent threw error on Ollama unavailability:`, err.message);
    issuesFound++;
  }

  console.log("\n==================================================");
  console.log(`🏁 FAILURE TESTING COMPLETED. Issues: ${issuesFound}`);
  console.log("==================================================");
}

runFailureTesting().catch(console.error);
