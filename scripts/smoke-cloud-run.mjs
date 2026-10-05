// Read-only checks against a deployed BlankLearn backend. No bookings or charges.
const base = process.argv[2];
if (!base || !/^https:\/\//.test(base)) throw new Error('Usage: node scripts/smoke-cloud-run.mjs https://SERVICE.run.app');
const origin = new URL(base).origin;
const checks = [
  ['/api/health', 'GET', 200],
  ['/api/platform-settings', 'GET', 200],
  ['/api/help-chat', 'GET', 401],
  ['/api/livekit/token?sessionId=unauthorized-smoke-check', 'GET', 401],
  ['/api/demo/book', 'POST', 401],
  ['/api/razorpay/order', 'POST', 401],
  ['/api/razorpay/verify', 'POST', 401],
];
for (const [endpoint, method, expected] of checks) {
  const response = await fetch(`${origin}${endpoint}`, {
    method, redirect: 'manual', signal: AbortSignal.timeout(30000),
    ...(method === 'POST' ? { headers: { 'Content-Type': 'application/json' }, body: '{}' } : {}),
  });
  if (response.status !== expected || !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(`${method} ${endpoint}: expected JSON ${expected}, got ${response.status}`);
  }
  const body = await response.json();
  if (endpoint === '/api/health' && body.ok !== true) throw new Error('Health payload invalid');
  if (endpoint === '/api/platform-settings' && (!Number.isFinite(body.demoFee) || !body.plans?.M1_D3)) throw new Error('Settings payload invalid');
  console.log(`PASS ${method} ${endpoint}: ${response.status}`);
}
