const tests = [];

async function test(name, fn) {
  try {
    await fn();
    tests.push({ name, status: 'PASS' });
    console.log('✓', name);
  } catch (e) {
    tests.push({ name, status: 'FAIL', error: e.message });
    console.error('✗', name, '-', e.message);
  }
}

(async () => {
  console.log('\n=== API TESTS ===\n');
  
  // Test 1: Login with admin
  await test('Login ADMIN', async () => {
    const res = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@yandoxcrm.com', password: 'Admin@123' })
    });
    if (res.status !== 200) throw new Error('Expected 200, got ' + res.status);
    const data = await res.json();
    if (!data.data.accessToken) throw new Error('No access token');
  });

  // Test 2: Login with agent
  await test('Login AGENT', async () => {
    const res = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'agent@yandoxcrm.com', password: 'Agent@123' })
    });
    if (res.status !== 200) throw new Error('Expected 200, got ' + res.status);
    const data = await res.json();
    if (!data.data.accessToken) throw new Error('No access token');
  });

  // Get admin token for subsequent tests
  const adminLogin = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@yandoxcrm.com', password: 'Admin@123' })
  });
  const adminData = await adminLogin.json();
  const adminToken = adminData.data.accessToken;

  // Test 3: Get me endpoint
  await test('GET /auth/me', async () => {
    const res = await fetch('http://localhost:4000/api/auth/me', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    if (res.status !== 200) throw new Error('Expected 200, got ' + res.status);
    const data = await res.json();
    if (data.data.email !== 'admin@yandoxcrm.com') throw new Error('Wrong email');
  });

  // Test 4: Cookie-based refresh
  await test('Cookie-based refresh', async () => {
    const loginRes = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'agent@yandoxcrm.com', password: 'Agent@123' })
    });
    const loginData = await loginRes.json();
    const refreshToken = loginData.data.refreshToken;
    const res = await fetch('http://localhost:4000/api/auth/refresh', {
      method: 'POST',
      headers: { 'cookie': 'refresh_token=' + refreshToken }
    });
    if (res.status !== 200) throw new Error('Expected 200, got ' + res.status);
    const data = await res.json();
    if (!data.data.accessToken) throw new Error('No access token');
  });

  // Test 5: Get customers list
  await test('GET /api/customers', async () => {
    const res = await fetch('http://localhost:4000/api/customers', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    if (res.status !== 200) throw new Error('Expected 200, got ' + res.status);
    const data = await res.json();
    if (!Array.isArray(data.data.data)) throw new Error('Expected array');
  });

  // Test 6: Get properties list
  await test('GET /api/properties', async () => {
    const res = await fetch('http://localhost:4000/api/properties', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    if (res.status !== 200) throw new Error('Expected 200, got ' + res.status);
    const data = await res.json();
    if (!Array.isArray(data.data.data)) throw new Error('Expected array');
  });

  // Test 7: Get agents list
  await test('GET /api/agents', async () => {
    const res = await fetch('http://localhost:4000/api/agents', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    if (res.status !== 200) throw new Error('Expected 200, got ' + res.status);
    const data = await res.json();
    if (!Array.isArray(data.data)) throw new Error('Expected array');
  });

  // Test 8: Get leads list
  await test('GET /api/leads', async () => {
    const res = await fetch('http://localhost:4000/api/leads', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    if (res.status !== 200) throw new Error('Expected 200, got ' + res.status);
    const data = await res.json();
    if (!Array.isArray(data.data)) throw new Error('Expected array');
  });

  // Test 9: Get dashboard stats
  await test('GET /api/dashboard/stats', async () => {
    const res = await fetch('http://localhost:4000/api/dashboard/summary', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    if (res.status !== 200) throw new Error('Expected 200, got ' + res.status);
    const data = await res.json();
    if (!data.data) throw new Error('No data');
  });

  // Test 10: Create customer
  let customerId = null;
  await test('POST /api/customers (create)', async () => {
    const res = await fetch('http://localhost:4000/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
      body: JSON.stringify({ name: 'Test Customer ' + Date.now(), email: 'testcust' + Date.now() + '@example.com', phone: '1234567890' })
    });
    if (res.status !== 201 && res.status !== 200) throw new Error('Expected 200/201, got ' + res.status);
    const data = await res.json();
    if (!data.data || !data.data.id) throw new Error('No data or id');
    customerId = data.data.id;
  });

  // Test 11: Get customer by ID
  if (customerId) {
    await test('GET /api/customers/:id', async () => {
      const res = await fetch('http://localhost:4000/api/customers/' + customerId, {
        headers: { 'Authorization': 'Bearer ' + adminToken }
      });
      if (res.status !== 200) throw new Error('Expected 200, got ' + res.status);
      const data = await res.json();
      if (data.data.id !== customerId) throw new Error('Wrong customer');
    });
  }

  // Test 12: Update customer
  if (customerId) {
    await test('PUT /api/customers/:id (update)', async () => {
      const res = await fetch('http://localhost:4000/api/customers/' + customerId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
        body: JSON.stringify({ name: 'Updated Customer ' + Date.now(), email: 'updated' + Date.now() + '@example.com' })
      });
      if (res.status !== 200 && res.status !== 204) throw new Error('Expected 200/204, got ' + res.status);
    });
  }

  // Test 13: Delete customer
  if (customerId) {
    await test('DELETE /api/customers/:id', async () => {
      const res = await fetch('http://localhost:4000/api/customers/' + customerId, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + adminToken }
      });
      if (res.status !== 200 && res.status !== 204) throw new Error('Expected 200/204, got ' + res.status);
    });
  }

  // Test 14: Unauthorized access (invalid token)
  await test('401 Unauthorized (invalid token)', async () => {
    const res = await fetch('http://localhost:4000/api/customers', {
      headers: { 'Authorization': 'Bearer invalid' }
    });
    if (res.status !== 401) throw new Error('Expected 401, got ' + res.status);
  });

  // Test 15: Missing authorization
  await test('401 Unauthorized (missing token)', async () => {
    const res = await fetch('http://localhost:4000/api/customers');
    if (res.status !== 401) throw new Error('Expected 401, got ' + res.status);
  });

  // Test 16: Invalid credentials
  await test('401 Invalid credentials', async () => {
    const res = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@yandoxcrm.com', password: 'WrongPassword' })
    });
    if (res.status !== 401 && res.status !== 400) throw new Error('Expected 401/400, got ' + res.status);
  });

  // Test 17: Create property
  let propertyId = null;
  await test('POST /api/properties (create)', async () => {
    const res = await fetch('http://localhost:4000/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
      body: JSON.stringify({ 
        title: 'Test Property ' + Date.now(), 
        description: 'Test Property description',
        price: 500000,
        city: 'TestCity',
        state: 'TS',
        address: '123 Test St', 
        propertyType: 'APARTMENT',
        bhk: 3,
        bathrooms: 2,
        area: '1500 sqft' 
      })
    });
    if (res.status !== 201 && res.status !== 200) throw new Error('Expected 200/201, got ' + res.status);
    const data = await res.json();
    if (!data.data || !data.data.id) throw new Error('No data or id');
    propertyId = data.data.id;
  });

  // Test 18: Get property by ID
  if (propertyId) {
    await test('GET /api/properties/:id', async () => {
      const res = await fetch('http://localhost:4000/api/properties/' + propertyId, {
        headers: { 'Authorization': 'Bearer ' + adminToken }
      });
      if (res.status !== 200) throw new Error('Expected 200, got ' + res.status);
      const data = await res.json();
      if (data.data.id !== propertyId) throw new Error('Wrong property');
    });
  }

  console.log('\n=== TEST SUMMARY ===\n');
  const passed = tests.filter(t => t.status === 'PASS').length;
  const failed = tests.filter(t => t.status === 'FAIL').length;
  console.log('Passed: ' + passed + ' / ' + tests.length);
  console.log('Failed: ' + failed + ' / ' + tests.length);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    tests.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(' - ' + t.name + ': ' + t.error);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
})();
