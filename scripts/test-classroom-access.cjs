const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports, console, process: { env: { LIVEKIT_URL: 'wss://test.invalid', LIVEKIT_API_KEY: 'test', LIVEKIT_API_SECRET: 'test' } }, require: name => {
    if (!(name in dependencies)) throw Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}
const access = load('src/lib/classroom/studentAccess.ts');
function fixture(status, date, enrolled = true) {
  const session = { status, date, startTime: '18:00', endTime: '19:00', teacherId: 'teacher', studentIds: enrolled ? ['student'] : [] };
  const db = { collection(name) {
    return { doc(id) { return { get: async () => ({ id, exists: true, data: () => name === 'class_sessions' ? session : name === 'users' ? { role: 'STUDENT' } : { name: 'Test Student' } }) }; },
      where() { return this; }, limit() { return this; }, get: async () => ({ empty: true, docs: [] }) };
  }};
  const deps = {
    '@/lib/classroom/studentAccess': access,
    'next/server': { NextResponse: { json: (body, options) => ({ status: options?.status || 200, body }) } },
    'firebase-admin/firestore': {},
    '@/lib/firebase/admin': { adminAuth: { verifyIdToken: async () => ({ uid: 'student', name: 'Test Student' }) }, adminDb: db },
    'livekit-server-sdk': { AccessToken: class { addGrant() {} async toJwt() { return 'room-token'; } } },
  };
  const request = { headers: new Headers({ authorization: 'Bearer test' }), nextUrl: new URL('https://test.invalid/api/livekit/token?sessionId=lesson') };
  return { deps, request };
}
test('teacher-open classes allow joins before/after the schedule and without schedule metadata', () => {
  for (const status of ['LIVE', 'OPEN_FOR_JOIN', 'PAUSED', 'TECHNICAL_ISSUE']) {
    for (const date of ['2000-01-01', '2099-01-01', undefined]) {
      assert.equal(access.studentAccess({ status, date, startTime: '18:00', endTime: '19:00' }).allowed, true);
    }
  }
  for (const status of ['SCHEDULED', 'PREPARING', 'ENDED', 'CANCELLED', 'COMPLETED', 'PROCESSING', 'UNKNOWN']) assert.equal(access.studentAccess({ status }).allowed, false);
});
test('status endpoint explicitly tells mobile/web whether they may join, without checking the clock', async () => {
  for (const [status, allowed] of [['LIVE', true], ['PAUSED', true], ['SCHEDULED', false], ['ENDED', false]]) {
    const { deps, request } = fixture(status, '2000-01-01');
    const route = load('src/app/api/class_sessions/[sessionId]/status/route.ts', deps);
    const result = await route.GET(request, { params: Promise.resolve({ sessionId: 'lesson' }) });
    assert.equal(result.status, 200);
    assert.equal(result.body.session.studentJoinAllowed, allowed);
    assert.equal(result.body.session.joinPolicy, 'TEACHER_CONTROLLED');
    assert.equal(typeof result.body.session.studentJoinMessage, 'string');
  }
});
test('LiveKit token endpoint admits assigned students at any time and keeps lifecycle/membership restrictions', async () => {
  for (const date of ['2000-01-01', '2099-01-01']) {
    for (const [status, expected] of [['LIVE', 200], ['PAUSED', 200], ['TECHNICAL_ISSUE', 200], ['SCHEDULED', 409], ['ENDED', 409]]) {
      const { deps, request } = fixture(status, date);
      const result = await load('src/app/api/livekit/token/route.ts', deps).GET(request);
      assert.equal(result.status, expected, `${date}: ${status}`);
      if (expected === 200) assert.equal(result.body.token, 'room-token');
    }
  }
  const { deps, request } = fixture('LIVE', '2000-01-01', false);
  const route = load('src/app/api/livekit/token/route.ts', deps);
  assert.equal((await route.GET(request)).status, 403);
  request.headers = new Headers();
  assert.equal((await route.GET(request)).status, 401);
});

test('verified assigned teacher starts a future lesson with one LIVE mutation; other teachers cannot', async () => {
  for (const assigned of [true, false]) {
    const writes = [];
    const { deps } = fixture('SCHEDULED', '2099-01-01');
    deps['@/lib/firebase/admin'] = {
      adminAuth: { verifyIdToken: async () => ({ uid: 'teacher' }) },
      adminDb: { collection(name) { return { doc(id) { return {
        get: async () => ({ exists: true, id, data: () => name === 'teachers' ? { applicationStatus: 'APPROVED', kycStatus: 'VERIFIED' } : { status: 'SCHEDULED', date: '2099-01-01', teacherId: assigned ? 'teacher' : 'another-teacher' } }),
        update: async data => writes.push(data),
      }; } }; } },
    };
    deps['firebase-admin/firestore'] = { FieldValue: { serverTimestamp: () => 'server-time' } };
    const request = { headers: new Headers({ authorization: 'Bearer teacher-token' }), json: async () => ({ status: 'LIVE' }) };
    const result = await load('src/app/api/class_sessions/[sessionId]/status/route.ts', deps).PATCH(request, { params: Promise.resolve({ sessionId: 'lesson' }) });
    assert.equal(result.status, assigned ? 200 : 403);
    assert.equal(writes.length, assigned ? 1 : 0);
    if (assigned) assert.equal(writes[0].status, 'LIVE');
  }
});
