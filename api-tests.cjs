const http = require('http');
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

async function fetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: opts.method || 'GET',
      headers: opts.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(JSON.stringify(opts.body));
    req.end();
  });
}

(async () => {
  console.log('\n=== API TESTS ===\n');
  
  // Test 1: Login with admin
  await test('Login ADMIN', async () => {
    const res = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'admin@yandoxcrm.com', password: 'Admin@123' }
    });
    if (res.status !== 200) throw new Error('Expected 200');
    if (!res.body.data.accessToken) throw new Error('No access token');
  });

  // Test 2: Login with agent
  await test('Login AGENT', async () => {
    const res = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'agent@yandoxcrm.com', password: 'Agent@123' }
    });
    if (res.status !== 200) throw new Error('Expected 200');
    if (!res.body.data.accessToken) throw new Error('No access token');
  });

  // Get admin token for subsequent tests
  const adminLogin = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'admin@yandoxcrm.com', password: 'Admin@123' }
  });
  const adminToken = adminLogin.body.data.accessToken;

  // Test 3: Get me endpoint
  await test('GET /auth/me', async () => {
    const res = await fetch('http://localhost:4000/api/auth/me', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    if (res.status !== 200) throw new Error('Expected 200, got ' + res.status);
    if (res.body.data.email !== 'admin@yandoxcrm.com') throw new Error('Wrong email');
  });

  // Test 4: Cookie-based refresh
  await test('Cookie-based refresh', async () => {
    const loginRes = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'agent@yandoxcrm.com', password: 'Agent@123' }
    });
    const refreshToken = loginRes.body.data.refreshToken;
    const res = await fetch('http://localhost:4000/api/auth/refresh', {
      method: 'POST',
      headers: { 'cookie': 'refresh_token=' + refreshToken }
    });
    if (res.status !== 200) throw new Error('Expected 200, got ' + res.status);
    if (!res.body.data.accessToken) throw new Error('No access token');
  });

  // Test 5: Get customers list
  await test('GET /api/customers', async () => {
    const res = await fetch('http://localhost:4000/api/customers', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    if (res.status !== 200) throw new Error('Expected 200, got ' + res.status);
    if (!Array.isArray(res.body.data.data)) throw new Error('Expected array');
  });

  // Test 6: Get properties list
  await test('GET /api/properties', async () => {
    const res = await fetch('http://localhost:4000/api/properties', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    if (res.status !== 200) throw new Error('Expected 200, got ' + res.status);
    if (!Array.isArray(res.body.data.data)) throw new Error('Expected array');
  });

  // Test 7: Get agents list
  await test('GET /api/agents', async () => {
    const res = await fetch('http://localhost:4000/api/agents', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    if (res.status !== 200) throw new Error('Expected 200, got ' + res.status);
    if (!Array.isArray(res.body.data)) throw new Error('Expected array');
  });

  // Test 8: Get leads list
  await test('GET /api/leads', async () => {
    const res = await fetch('http://localhost:4000/api/leads', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    if (res.status !== 200) throw new Error('Expected 200, got ' + res.status);
    if (!Array.isArray(res.body.data)) throw new Error('Expected array');
  });

  // Test 9: Get dashboard stats
  await test('GET /api/dashboard/stats', async () => {
    const res = await fetch('http://localhost:4000/api/dashboard/summary', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    if (res.status !== 200) throw new Error('Expected 200, got ' + res.status);
    if (!res.body.data) throw new Error('No data');
  });

  // Test 10: Create customer
  let customerId = null;
  await test('POST /api/customers (create)', async () => {
    const res = await fetch('http://localhost:4000/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
      body: { name: 'Test Customer ' + Date.now(), email: 'testcust' + Date.now() + '@example.com', phone: '1234567890' }
    });
    if (res.status !== 201 && res.status !== 200) throw new Error('Expected 200/201, got ' + res.status);
    if (!res.body.data || !res.body.data.id) throw new Error('No data or id');
    customerId = res.body.data.id;
  });

  // Test 11: Get customer by ID
  if (customerId) {
    await test('GET /api/customers/:id', async () => {
      const res = await fetch('http://localhost:4000/api/customers/' + customerId, {
        headers: { 'Authorization': 'Bearer ' + adminToken }
      });
      if (res.status !== 200) throw new Error('Expected 200, got ' + res.status);
      if (res.body.data.id !== customerId) throw new Error('Wrong customer');
    });
  }

  // Test 12: Update customer
  if (customerId) {
    await test('PUT /api/customers/:id (update)', async () => {
      const res = await fetch('http://localhost:4000/api/customers/' + customerId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
        body: { name: 'Updated Customer', email: 'updated@example.com' }
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

  console.log('\n=== TEST SUMMARY ===\n');
  const passed = tests.filter(t => t.status === 'PASS').length;
  const failed = tests.filter(t => t.status === 'FAIL').length;
  console.log('Passed: ' + passed);
  console.log('Failed: ' + failed);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    tests.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(' - ' + t.name + ': ' + t.error);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
})();
