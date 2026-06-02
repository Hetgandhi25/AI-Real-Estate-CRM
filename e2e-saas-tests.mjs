// Native fetch is globally available in modern Node versions, but let's check or handle it
const BASE_URL = "http://localhost:4000/api";

const tests = [];
let totalAsserts = 0;
let passedAsserts = 0;

function assert(condition, message) {
  totalAsserts++;
  if (condition) {
    passedAsserts++;
  } else {
    throw new Error(message || "Assertion failed");
  }
}

async function testSection(name, fn) {
  console.log(`\n────────────────────────────────────────────────────────────────`);
  console.log(`📋 ${name.toUpperCase()}`);
  console.log(`────────────────────────────────────────────────────────────────`);
  try {
    await fn();
    tests.push({ name, status: "PASS" });
    console.log(`  ✅ Section: ${name} completed successfully.`);
  } catch (e) {
    tests.push({ name, status: "FAIL", error: e.message });
    console.error(`  ❌ Section: ${name} failed - ${e.message}`);
  }
}

(async () => {
  console.log(`🔬 Yandox CRM — Full E2E SaaS Integration Test Suite`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Time: ${new Date().toISOString()}`);

  let adminToken = null;
  let adminRefreshToken = null;
  let agentToken = null;
  let agentId = null;
  let testCustomerId = null;
  let testPropertyId = null;
  let testLeadId = null;
  let testAppointmentId = null;
  let testReviewId = null;
  let testConversationId = null;

  // 1. HEALTH CHECK
  await testSection("1. Health Check", async () => {
    const res = await fetch(`${BASE_URL}/health`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const body = await res.json();
    assert(body.success === true, "Expected success to be true");
    assert(body.data.status === "ok", "Expected status to be ok");
  });

  // 2. AUTHENTICATION & SESSION
  await testSection("2. Authentication & Session Handling", async () => {
    // Admin login
    const loginAdminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@yandoxcrm.com", password: "Admin@123" }),
    });
    assert(loginAdminRes.status === 200, `Admin login failed with status ${loginAdminRes.status}`);
    const adminAuth = await loginAdminRes.json();
    assert(adminAuth.success === true, "Admin login success should be true");
    assert(adminAuth.data.accessToken, "No admin access token returned");
    assert(adminAuth.data.refreshToken, "No admin refresh token returned");
    assert(adminAuth.data.user.role === "admin", "Admin user role should be admin");
    adminToken = adminAuth.data.accessToken;
    adminRefreshToken = adminAuth.data.refreshToken;

    // Agent login
    const loginAgentRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "agent@yandoxcrm.com", password: "Agent@123" }),
    });
    assert(loginAgentRes.status === 200, `Agent login failed with status ${loginAgentRes.status}`);
    const agentAuth = await loginAgentRes.json();
    assert(agentAuth.data.accessToken, "No agent access token returned");
    agentToken = agentAuth.data.accessToken;
    agentId = agentAuth.data.user.id;

    // GET /auth/me
    const getMeRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(getMeRes.status === 200, `GET /auth/me failed with status ${getMeRes.status}`);
    const meData = await getMeRes.json();
    assert(meData.data.email === "admin@yandoxcrm.com", "Me profile email mismatch");
    assert(meData.data.role === "admin", "Me profile role mismatch");

    // Cookie/Header-based token refresh
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "cookie": `refresh_token=${adminRefreshToken}`,
      },
      body: JSON.stringify({ refreshToken: adminRefreshToken }),
    });
    assert(refreshRes.status === 200, `POST /auth/refresh failed with status ${refreshRes.status}`);
    const refreshData = await refreshRes.json();
    assert(refreshData.success === true, "Token refresh success should be true");
    assert(refreshData.data.accessToken, "No new access token returned after refresh");

    // Profile updates
    const updateProfileRes = await fetch(`${BASE_URL}/auth/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: "Admin User Updated" }),
    });
    assert(updateProfileRes.status === 200, `Update profile failed with status ${updateProfileRes.status}`);
    const updatedMeRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const updatedMeData = await updatedMeRes.json();
    assert(updatedMeData.data.name === "Admin User Updated", "Updated profile name did not persist");

    // Revert name back to keep DB clean
    await fetch(`${BASE_URL}/auth/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: "Admin User" }),
    });

    // Auth validation failure cases
    const wrongPasswordRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@yandoxcrm.com", password: "WrongPassword123" }),
    });
    assert(wrongPasswordRes.status === 401 || wrongPasswordRes.status === 400, "Wrong password should return 401/400");

    const nonExistingUserRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ghost@yandoxcrm.com", password: "Admin@123" }),
    });
    assert(nonExistingUserRes.status === 401 || nonExistingUserRes.status === 404 || nonExistingUserRes.status === 400, "Ghost login should fail");

    const tamperedJwtRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer invalidTokenPattern123` },
    });
    assert(tamperedJwtRes.status === 401, "Tampered token should return 401");

    const missingAuthRes = await fetch(`${BASE_URL}/auth/me`);
    assert(missingAuthRes.status === 401, "Missing token should return 401");
  });

  // 3. ROLE-BASED ACCESS CONTROL (RBAC)
  await testSection("3. Role-Based Access Control", async () => {
    // Agents endpoints: Admin or Manager only
    const getAgentsAsAgentRes = await fetch(`${BASE_URL}/agents`, {
      headers: { Authorization: `Bearer ${agentToken}` },
    });
    assert(getAgentsAsAgentRes.status === 403, `Agent should be forbidden from getting agents, got status ${getAgentsAsAgentRes.status}`);

    const getAgentsAsAdminRes = await fetch(`${BASE_URL}/agents`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(getAgentsAsAdminRes.status === 200, `Admin should be allowed to get agents, got status ${getAgentsAsAdminRes.status}`);
    const agentsList = await getAgentsAsAdminRes.json();
    assert(Array.isArray(agentsList.data), "Expected agents list to be an array");

    // Creating agent as agent should be forbidden
    const createAgentAsAgentRes = await fetch(`${BASE_URL}/agents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${agentToken}`,
      },
      body: JSON.stringify({
        name: "Forbidden Agent",
        email: "forbidden@example.com",
        password: "Password@123",
      }),
    });
    assert(createAgentAsAgentRes.status === 403, `Creating agent with agent token should be forbidden, got status ${createAgentAsAgentRes.status}`);
  });

  // 4. PROPERTIES CRUD
  await testSection("4. Properties CRUD & Filters", async () => {
    // Fetch properties unauthenticated
    const getPropsRes = await fetch(`${BASE_URL}/properties`);
    assert(getPropsRes.status === 200, `GET /properties (unauth) failed with status ${getPropsRes.status}`);
    const propsData = await getPropsRes.json();
    assert(Array.isArray(propsData.data.data), "Expected properties list to contain data array");

    // Create a property (requires auth)
    const createPropRes = await fetch(`${BASE_URL}/properties`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "Sunset Boulevard Condo",
        description: "Stunning high-floor condo with skyline and beach views.",
        price: 749000,
        city: "Los Angeles",
        state: "CA",
        address: "8820 Sunset Blvd",
        propertyType: "APARTMENT",
        bhk: 2,
        bathrooms: 2,
        area: "1,200 sqft",
        status: "FOR_SALE",
        amenities: ["Pool", "Gym", "Concierge"],
        images: ["image1.jpg", "image2.jpg"],
      }),
    });
    assert(createPropRes.status === 201, `Property creation failed with status ${createPropRes.status}`);
    const createdProp = await createPropRes.json();
    assert(createdProp.data.id, "No property ID returned");
    assert(createdProp.data.title === "Sunset Boulevard Condo", "Property title mismatch");
    assert(createdProp.data.status === "FOR_SALE", "Property default status mismatch");
    testPropertyId = createdProp.data.id;

    // Get property details
    const getPropDetailRes = await fetch(`${BASE_URL}/properties/${testPropertyId}`);
    assert(getPropDetailRes.status === 200, `GET property details failed`);
    const propDetail = await getPropDetailRes.json();
    assert(propDetail.data.price === 749000, "Property price mismatch");

    // Update property
    const updatePropRes = await fetch(`${BASE_URL}/properties/${testPropertyId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        price: 729000,
        description: "Price reduced! Stunning high-floor condo with skyline views.",
      }),
    });
    assert(updatePropRes.status === 200, `Property update failed with status ${updatePropRes.status}`);
    const updatedProp = await updatePropRes.json();
    assert(updatedProp.data.price === 729000, "Property updated price mismatch");

    // List properties with filters (search & city & type)
    const filteredPropsRes = await fetch(`${BASE_URL}/properties?search=Sunset&city=Los Angeles&type=APARTMENT`);
    assert(filteredPropsRes.status === 200, "GET filtered properties failed");
    const filteredProps = await filteredPropsRes.json();
    assert(filteredProps.data.data.length > 0, "No filtered property matches found");
    assert(filteredProps.data.data.some(p => p.id === testPropertyId), "Created property not found in filtered search");
  });

  // 5. CUSTOMERS CRUD & UNIQUE VALIDATION
  await testSection("5. Customers CRUD & Duplicate Email Protection", async () => {
    const uniqueEmail = `qa_cust_${Date.now()}@example.com`;

    // Create Customer
    const createCustRes = await fetch(`${BASE_URL}/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: "Test Customer E2E",
        email: uniqueEmail,
        phone: "+1-310-555-8888",
        budget: 800000,
        preferredLocation: "Los Angeles, CA",
        notes: "Highly qualified buyer looking for an apartment or condo.",
      }),
    });
    assert(createCustRes.status === 201 || createCustRes.status === 200, `Customer creation failed with status ${createCustRes.status}`);
    const createdCust = await createCustRes.json();
    assert(createdCust.data.id, "No customer ID returned");
    testCustomerId = createdCust.data.id;

    // Test Duplicate Email Guard
    const createDuplicateCustRes = await fetch(`${BASE_URL}/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: "Duplicate Customer",
        email: uniqueEmail,
        phone: "+1-310-555-9999",
      }),
    });
    assert(createDuplicateCustRes.status === 409 || createDuplicateCustRes.status === 400, `Duplicate email should trigger conflict status 409/400, got ${createDuplicateCustRes.status}`);

    // GET customer details
    const getCustRes = await fetch(`${BASE_URL}/customers/${testCustomerId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(getCustRes.status === 200, `GET customer details failed`);
    const custDetail = await getCustRes.json();
    assert(custDetail.data.name === "Test Customer E2E", "Customer name mismatch");

    // Update customer
    const updateCustRes = await fetch(`${BASE_URL}/customers/${testCustomerId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: "Test Customer Updated",
        budget: 850000,
      }),
    });
    assert(updateCustRes.status === 200, `Update customer failed with status ${updateCustRes.status}`);

    // List customers with search
    const listCustsRes = await fetch(`${BASE_URL}/customers?search=Updated`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(listCustsRes.status === 200, "GET customers list failed");
    const custsList = await listCustsRes.json();
    assert(custsList.data.data.some(c => c.id === testCustomerId), "Created customer not found in customer search results");
  });

  // 6. LEADS LIFECYCLE
  await testSection("6. Leads CRM Lifecycle & Pipeline Stages", async () => {
    // Create lead
    const createLeadRes = await fetch(`${BASE_URL}/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        customerId: testCustomerId,
        propertyId: testPropertyId,
        status: "NEW",
        source: "WEBSITE",
        notes: "Interested in visiting the Sunset Blvd Condo.",
        assignedAgentId: agentId,
      }),
    });
    assert(createLeadRes.status === 201, `Lead creation failed with status ${createLeadRes.status}`);
    const createdLead = await createLeadRes.json();
    assert(createdLead.data.id, "No lead ID returned");
    testLeadId = createdLead.data.id;

    // GET lead detail
    const getLeadRes = await fetch(`${BASE_URL}/leads/${testLeadId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(getLeadRes.status === 200, `GET lead details failed`);
    const leadDetail = await getLeadRes.json();
    assert(leadDetail.data.status === "NEW", "Lead status should be NEW");

    // Update lead through pipeline stages
    const stages = ["CONTACTED", "QUALIFIED", "WON"];
    for (const stage of stages) {
      const updateLeadRes = await fetch(`${BASE_URL}/leads/${testLeadId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: stage }),
      });
      assert(updateLeadRes.status === 200, `Update lead to stage ${stage} failed`);
      const updatedLead = await updateLeadRes.json();
      assert(updatedLead.data.status === stage, `Lead status mismatch: expected ${stage}, got ${updatedLead.data.status}`);
    }

    // List leads
    const listLeadsRes = await fetch(`${BASE_URL}/leads`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(listLeadsRes.status === 200, "GET leads list failed");
    const leadsList = await listLeadsRes.json();
    assert(leadsList.data.some(l => l.id === testLeadId), "Created lead not present in list");
  });

  // 7. CALENDAR & APPOINTMENTS
  await testSection("7. Calendar & Appointments Scheduler", async () => {
    // Schedule appointment
    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 2); // 2 days in the future

    const createAppointmentRes = await fetch(`${BASE_URL}/appointments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        customerId: testCustomerId,
        propertyId: testPropertyId,
        assignedAgentId: agentId,
        scheduledAt: appointmentDate.toISOString(),
        status: "SCHEDULED",
        notes: "E2E scheduled walkthrough.",
      }),
    });
    assert(createAppointmentRes.status === 201, `Appointment creation failed with status ${createAppointmentRes.status}`);
    const createdAppointment = await createAppointmentRes.json();
    assert(createdAppointment.data.id, "No appointment ID returned");
    testAppointmentId = createdAppointment.data.id;

    // GET appointment detail
    const getAppointmentRes = await fetch(`${BASE_URL}/appointments/${testAppointmentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(getAppointmentRes.status === 200, `GET appointment failed`);
    const apptDetail = await getAppointmentRes.json();
    assert(apptDetail.data.status === "SCHEDULED", "Appointment status mismatch");

    // Update appointment status to CONFIRMED
    const updateApptRes = await fetch(`${BASE_URL}/appointments/${testAppointmentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "CONFIRMED", notes: "Walkthrough confirmed by customer." }),
    });
    assert(updateApptRes.status === 200, `Update appointment failed with status ${updateApptRes.status}`);
    const updatedAppt = await updateApptRes.json();
    assert(updatedAppt.data.status === "CONFIRMED", "Appointment status was not updated");

    // List appointments
    const listApptRes = await fetch(`${BASE_URL}/appointments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(listApptRes.status === 200, "GET appointments list failed");
    const apptsList = await listApptRes.json();
    assert(apptsList.data.some(a => a.id === testAppointmentId), "Scheduled appointment not found in appointments list");
  });

  // 8. REVIEWS & RATINGS
  await testSection("8. Reviews & Ratings Module", async () => {
    // Add Review
    const createReviewRes = await fetch(`${BASE_URL}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        customerId: testCustomerId,
        reviewerName: "John Parker",
        rating: 5,
        comment: "Excellent service from start to finish. Highly recommend Yandox CRM!",
      }),
    });
    assert(createReviewRes.status === 201, `Review creation failed with status ${createReviewRes.status}`);
    const createdReview = await createReviewRes.json();
    assert(createdReview.data.id, "No review ID returned");
    testReviewId = createdReview.data.id;

    // GET review detail
    const getReviewRes = await fetch(`${BASE_URL}/reviews/${testReviewId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(getReviewRes.status === 200, `GET review failed`);
    const reviewDetail = await getReviewRes.json();
    assert(reviewDetail.data.rating === 5, "Review rating mismatch");

    // Update review
    const updateReviewRes = await fetch(`${BASE_URL}/reviews/${testReviewId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ rating: 4, comment: "Updated review: very good service." }),
    });
    assert(updateReviewRes.status === 200, `Update review failed with status ${updateReviewRes.status}`);
    const updatedReview = await updateReviewRes.json();
    assert(updatedReview.data.rating === 4, "Updated review rating mismatch");

    // List reviews
    const listReviewsRes = await fetch(`${BASE_URL}/reviews`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(listReviewsRes.status === 200, "GET reviews list failed");
    const reviewsList = await listReviewsRes.json();
    assert(reviewsList.data.some(r => r.id === testReviewId), "Created review not found in reviews list");
  });

  // 9. MESSAGING & AI BOT
  await testSection("9. Messaging & AI Auto-Response Module", async () => {
    // Create Conversation
    const createConvRes = await fetch(`${BASE_URL}/conversations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        customerId: testCustomerId,
        messages: [{ from: "customer", text: "What is the price of the property?" }],
      }),
    });
    assert(createConvRes.status === 201 || createConvRes.status === 200, `Conversation creation failed with status ${createConvRes.status}`);
    const createdConv = await createConvRes.json();
    assert(createdConv.data.id, "No conversation ID returned");
    testConversationId = createdConv.data.id;

    // Send a message with AI Auto-response enabled
    const sendMessageRes = await fetch(`${BASE_URL}/conversations/${testConversationId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        text: "Can I schedule a visit this weekend?",
        from: "customer",
        withAiResponse: true,
      }),
    });
    assert(sendMessageRes.status === 200 || sendMessageRes.status === 201, `Sending message with AI failed with status ${sendMessageRes.status}`);
    const messageResponse = await sendMessageRes.json();
    
    // Verify that conversation history has the user message + AI response
    const getConvRes = await fetch(`${BASE_URL}/conversations/${testConversationId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(getConvRes.status === 200, `GET conversation detail failed`);
    const convDetail = await getConvRes.json();
    
    assert(convDetail.data.messages.length >= 3, `Expected at least 3 messages (initial, customer reply, and AI response), got ${convDetail.data.messages.length}`);
    const lastMsg = convDetail.data.messages[convDetail.data.messages.length - 1];
    assert(lastMsg.from === "agent", "Last message from should be agent/AI");
    assert(lastMsg.text.includes("tour") || lastMsg.text.includes("visit") || lastMsg.text.includes("schedule"), "AI message should contain touring advice");

    // List conversations
    const listConvRes = await fetch(`${BASE_URL}/conversations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(listConvRes.status === 200, "GET conversations list failed");
    const convsList = await listConvRes.json();
    assert(convsList.data.some(c => c.id === testConversationId), "Conversation not found in list");
  });

  // 10. DASHBOARD & ANALYTICS
  await testSection("10. Dashboard Analytics & KPI Verification", async () => {
    // GET /dashboard/summary
    const summaryRes = await fetch(`${BASE_URL}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(summaryRes.status === 200, `GET /dashboard/summary failed with status ${summaryRes.status}`);
    const summary = await summaryRes.json();
    assert(Array.isArray(summary.data.kpis), "kpis is missing or not an array");
    assert(summary.data.kpis.length >= 4, "Expected at least 4 KPI indicators");
    assert(Array.isArray(summary.data.revenueData), "revenueData is missing or not an array");
    assert(Array.isArray(summary.data.referrals), "referrals is missing or not an array");
    assert(Array.isArray(summary.data.customerGrowth), "customerGrowth is missing or not an array");
    assert(Array.isArray(summary.data.propertyTypes), "propertyTypes is missing or not an array");
    assert(Array.isArray(summary.data.topAgents), "topAgents is missing or not an array");

    // GET /dashboard/analytics
    const analyticsRes = await fetch(`${BASE_URL}/dashboard/analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(analyticsRes.status === 200, `GET /dashboard/analytics failed with status ${analyticsRes.status}`);
    const analytics = await analyticsRes.json();
    assert(Array.isArray(analytics.data.leadFunnel), "leadFunnel is missing or not an array");
    assert(Array.isArray(analytics.data.agentPerformance), "agentPerformance is missing or not an array");
    assert(Array.isArray(analytics.data.appointmentTrends), "appointmentTrends is missing or not an array");
    assert(Array.isArray(analytics.data.revenueMonthly), "revenueMonthly is missing or not an array");
    assert(analytics.data.newCustomers !== undefined, "newCustomers is missing");
    assert(analytics.data.totalCustomers !== undefined, "totalCustomers is missing");
  });

  // 11. CLEANUP & CASCADING DATA INTEGRITY
  await testSection("11. Cleanup & Cascading Integrity Checks", async () => {
    // Delete Review
    const delReviewRes = await fetch(`${BASE_URL}/reviews/${testReviewId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(delReviewRes.status === 204 || delReviewRes.status === 200, "Delete review failed");

    // Delete Appointment
    const delApptRes = await fetch(`${BASE_URL}/appointments/${testAppointmentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(delApptRes.status === 204 || delApptRes.status === 200, "Delete appointment failed");

    // Delete Lead
    const delLeadRes = await fetch(`${BASE_URL}/leads/${testLeadId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(delLeadRes.status === 204 || delLeadRes.status === 200, "Delete lead failed");

    // Delete Conversation
    const delConvRes = await fetch(`${BASE_URL}/conversations/${testConversationId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(delConvRes.status === 204 || delConvRes.status === 200, "Delete conversation failed");

    // Delete Property
    const delPropRes = await fetch(`${BASE_URL}/properties/${testPropertyId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(delPropRes.status === 204 || delPropRes.status === 200, "Delete property failed");

    // Delete Customer
    const delCustRes = await fetch(`${BASE_URL}/customers/${testCustomerId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(delCustRes.status === 204 || delCustRes.status === 200, "Delete customer failed");

    // Verify Cascade Deletions or 404s
    const verifyPropRes = await fetch(`${BASE_URL}/properties/${testPropertyId}`);
    assert(verifyPropRes.status === 404, `Property should return 404 after deletion, got ${verifyPropRes.status}`);

    const verifyCustRes = await fetch(`${BASE_URL}/customers/${testCustomerId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(verifyCustRes.status === 404, `Customer should return 404 after deletion, got ${verifyCustRes.status}`);

    // Logout
    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ refreshToken: adminRefreshToken }),
    });
    assert(logoutRes.status === 204 || logoutRes.status === 200, `Logout failed with status ${logoutRes.status}`);

    // Verify token invalidation after logout
    const postLogoutRefreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: adminRefreshToken }),
    });
    assert(postLogoutRefreshRes.status === 401, `Refresh token should be invalid after logout, got status ${postLogoutRefreshRes.status}`);
  });

  console.log(`\n================================================================`);
  console.log(`📊 FINAL TEST SUMMARY`);
  console.log(`================================================================`);
  const failedSections = tests.filter(t => t.status === "FAIL");
  console.log(`Passed Sections: ${tests.length - failedSections.length} / ${tests.length}`);
  console.log(`Failed Sections: ${failedSections.length} / ${tests.length}`);
  console.log(`Assertions: ${passedAsserts} passed / ${totalAsserts} total (${((passedAsserts / totalAsserts) * 100).toFixed(1)}%)`);

  if (failedSections.length > 0) {
    console.log(`\nFailed Sections Details:`);
    failedSections.forEach(f => console.log(` - ${f.name}: ${f.error}`));
    process.exit(1);
  } else {
    console.log(`\n✅ ALL MODULES AND E2E WORKFLOWS VERIFIED SUCCESSFULLY — PRODUCTION READY!`);
    process.exit(0);
  }
})();
