const email = `ui_ui_${Date.now()}@example.com`;
const password = 'Test1234!';

async function run() {
  const res = await fetch('http://localhost:4000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'UI Test', email, password }),
  });
  const data = await res.json().catch(() => null);
  console.log(JSON.stringify({ status: res.status, data, email, password }));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
