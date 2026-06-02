const fetch = global.fetch;
(async () => {
  try {
    const email = `qa_debug_${Date.now()}@example.com`;
    const password = 'Test1234!';

    const createRes = await fetch('http://localhost:4000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'QA Debug', email, password }),
    });
    const createBody = await createRes.json().catch(() => null);
    console.log('register', createRes.status, JSON.stringify(createBody));
    const token = createBody?.data?.accessToken;
    if (!token) return;

    const propRes = await fetch('http://localhost:4000/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: 'QA Debug Property',
        description: 'Debug property',
        price: 100000,
        city: 'TestCity',
        state: 'TestState',
        address: '123 Test Ave',
        propertyType: 'APARTMENT',
        bhk: 2,
        bathrooms: 2,
        area: '1000 sqft',
        amenities: ['Pool'],
        images: ['https://example.com/1.jpg'],
        status: 'FOR_SALE',
        featured: false,
      }),
    });
    const propBody = await propRes.json().catch(() => null);
    console.log('property', propRes.status, JSON.stringify(propBody));
    const propertyId = propBody?.data?.id;

    const custRes = await fetch('http://localhost:4000/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'QA Customer', email: `qa-cust-${Date.now()}@example.com`, phone: '555-000-1111', budget: 500000 }),
    });
    const custBody = await custRes.json().catch(() => null);
    console.log('create customer', custRes.status, JSON.stringify(custBody));

    const searchRes = await fetch('http://localhost:4000/api/customers?search=QA+Customer', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const searchText = await searchRes.text();
    console.log('search status', searchRes.status, searchText);
  } catch (error) {
    console.error(error);
  }
})();