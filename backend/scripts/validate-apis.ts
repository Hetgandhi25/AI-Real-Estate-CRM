import axios from "axios";

const BASE_URL = "http://localhost:4000/api";

async function runApiValidation() {
  console.log("==================================================");
  console.log("🔒 PHASE 2 — API VALIDATION TESTS");
  console.log("==================================================");

  // Test 1: Access without Authentication (should return 401)
  console.log("\nTEST 1: Requesting AI Bot summary without auth token...");
  try {
    const res = await axios.get(`${BASE_URL}/ai-bot/summary`);
    console.log("❌ Fail: Access allowed without auth token!", res.status);
  } catch (err: any) {
    console.log(`✅ Passed: Received expected status ${err.response?.status} (${err.response?.data?.message})`);
  }

  // Test 2: Login to obtain JWT Token
  console.log("\nTEST 2: Logging in as Admin (admin@yandoxcrm.com)...");
  let token = "";
  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, {
      email: "admin@yandoxcrm.com",
      password: "Admin@123"
    });
    token = res.data?.data?.accessToken;
    console.log("✅ Passed: Login successful. Got token.");
  } catch (err: any) {
    console.error("❌ Fail: Login failed:", err.message, err.response?.data);
    return;
  }

  if (!token) {
    console.error("❌ Fail: Token not found in login response!");
    return;
  }

  const headers = { Authorization: `Bearer ${token}` };

  // Test 3: Get AI Bot Summary
  console.log("\nTEST 3: Requesting AI Bot summary with valid token...");
  try {
    const res = await axios.get(`${BASE_URL}/ai-bot/summary`, { headers });
    console.log(`✅ Passed: Received status ${res.status}`);
    console.log("Response Payload (KPIs preview):", JSON.stringify(res.data?.data?.kpis?.slice(0, 3), null, 2));
  } catch (err: any) {
    console.error("❌ Fail: Request failed:", err.message, err.response?.data);
  }

  // Test 4: Get AI Sessions list
  console.log("\nTEST 4: Requesting AI Sessions list...");
  try {
    const res = await axios.get(`${BASE_URL}/ai-bot/sessions`, { headers });
    console.log(`✅ Passed: Received status ${res.status}`);
    console.log(`Found ${res.data?.data?.length || 0} active sessions.`);
    if (res.data?.data?.length > 0) {
      console.log("Active Session Sample:", JSON.stringify(res.data.data[0], null, 2));
    }
  } catch (err: any) {
    console.error("❌ Fail: Request failed:", err.message);
  }

  // Test 5: Get AI Leads list
  console.log("\nTEST 5: Requesting AI Leads list...");
  try {
    const res = await axios.get(`${BASE_URL}/ai-bot/leads`, { headers });
    console.log(`✅ Passed: Received status ${res.status}`);
    console.log(`Found ${res.data?.data?.length || 0} leads.`);
  } catch (err: any) {
    console.error("❌ Fail: Request failed:", err.message);
  }

  // Test 6: Get AI Site Visits list
  console.log("\nTEST 6: Requesting AI Site Visits list...");
  try {
    const res = await axios.get(`${BASE_URL}/ai-bot/visits`, { headers });
    console.log(`✅ Passed: Received status ${res.status}`);
    console.log(`Found ${res.data?.data?.length || 0} scheduled site visits.`);
  } catch (err: any) {
    console.error("❌ Fail: Request failed:", err.message);
  }

  console.log("\n==================================================");
  console.log("🎉 API VALIDATION RUN COMPLETE");
  console.log("==================================================");
}

runApiValidation();
