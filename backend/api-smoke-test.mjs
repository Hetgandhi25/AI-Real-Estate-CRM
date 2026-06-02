const base = 'http://localhost:4000/api';
const email = `qa_user_${Date.now()}@example.com`;
const password = 'Test1234!';
const headers = { 'Content-Type': 'application/json' };

async function call(path, opts = {}) {
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: { ...headers, ...(opts.headers || {}) },
  });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch (error) { body = text; }
  return { status: res.status, headers: res.headers, body };
}

async function run() {
  console.log('Registering user');
  let result = await call('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'QA User', email, password }),
  });
  console.log('register', result.status, result.body?.message || JSON.stringify(result.body));
  if (result.status !== 201) throw new Error('Register failed');
  const refreshToken = result.body.data.refreshToken;
  let token = result.body.data.accessToken;

  console.log('Checking /auth/me');
  result = await call('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
  console.log('me', result.status, JSON.stringify(result.body.data));
  if (result.status !== 200) throw new Error('/auth/me failed');

  console.log('Creating property');
  result = await call('/properties', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title: 'QA Property',
      description: 'Test property',
      price: 123456.78,
      city: 'TestCity',
      state: 'TestState',
      address: '123 Test Ave',
      propertyType: 'APARTMENT',
      bhk: 2,
      bathrooms: 2,
      area: '1200 sqft',
      amenities: ['Pool', 'Gym'],
      images: ['https://example.com/1.jpg'],
      status: 'FOR_SALE',
      featured: false,
    }),
  });
  console.log('create property', result.status);
  if (result.status !== 201) throw new Error('Property create failed ' + JSON.stringify(result.body));
  const property = result.body.data;

  console.log('Updating property');
  result = await call(`/properties/${property.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title: 'QA Property Updated' }),
  });
  console.log('update property', result.status, result.body.data?.title);
  if (result.status !== 200 || result.body.data?.title !== 'QA Property Updated') throw new Error('Property update failed');

  console.log('Searching property');
  result = await call('/properties?search=QA+Property', { headers: { Authorization: `Bearer ${token}` } });
  console.log('search property', result.status, result.body.meta?.total);
  if (result.status !== 200) throw new Error('Property list/search failed');

  console.log('Creating customer');
  result = await call('/customers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: 'QA Customer', email: `qa-cust-${Date.now()}@example.com`, phone: '555-000-1111', budget: 500000 }),
  });
  console.log('create customer', result.status);
  if (result.status !== 201) throw new Error('Customer create failed');
  const customer = result.body.data;

  console.log('Updating customer');
  result = await call(`/customers/${customer.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ notes: 'Updated note' }),
  });
  console.log('update customer', result.status);
  if (result.status !== 200) throw new Error('Customer update failed');

  console.log('Listing customers with search');
  result = await call('/customers?search=QA+Customer', { headers: { Authorization: `Bearer ${token}` } });
  console.log('list customers', result.status, result.body.meta?.total);
  if (result.status !== 200) throw new Error('Customer list/search failed');

  console.log('Creating lead');
  result = await call('/leads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ customerId: customer.id, propertyId: property.id, source: 'WEBSITE', notes: 'QA lead' }),
  });
  console.log('create lead', result.status);
  if (result.status !== 201) throw new Error('Lead create failed');
  const lead = result.body.data;

  console.log('Updating lead');
  result = await call(`/leads/${lead.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status: 'CONTACTED', notes: 'Followed up' }),
  });
  console.log('update lead', result.status);
  if (result.status !== 200) throw new Error('Lead update failed');

  console.log('Listing leads');
  result = await call('/leads', { headers: { Authorization: `Bearer ${token}` } });
  console.log('list leads', result.status, result.body.meta?.total);
  if (result.status !== 200) throw new Error('Lead list failed');

  console.log('Refreshing tokens');
  result = await call('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
  console.log('refresh', result.status, result.body.data?.accessToken ? 'ok' : 'fail');
  if (result.status !== 200) throw new Error('Refresh failed');

  console.log('Logging out');
  result = await call('/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ refreshToken }),
  });
  console.log('logout', result.status);
  if (result.status !== 204) throw new Error('Logout failed');

  console.log('Verifying refresh token invalidation after logout');
  result = await call('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
  console.log('refresh after logout', result.status);
  if (result.status === 200) throw new Error('Refresh token still valid after logout');

  console.log('Cleaning up records');
  await call(`/leads/${lead.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  await call(`/customers/${customer.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  await call(`/properties/${property.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });

  console.log('API smoke tests completed successfully');
}

run().catch((error) => {
  console.error('Smoke test failed:', error);
  process.exit(1);
});
