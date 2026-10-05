const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function adminModule(env) {
  const calls = [];
  const instance = { marker: 'bound', collection() { return this.marker; } };
  const app = { credential: null };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('src/lib/firebase/admin.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { exports, process: { env }, require(name) {
    if (name === 'firebase-admin/app') return {
      getApps: () => [],
      initializeApp: options => { calls.push(options); return app; },
      cert: value => ({ type: 'cert', value }), applicationDefault: () => ({ type: 'adc' }),
    };
    if (name === 'firebase-admin/firestore') return { getFirestore: (_app, database) => { assert.equal(database, 'dark'); return instance; } };
    if (name === 'firebase-admin/auth') return { getAuth: () => instance };
    if (name === 'firebase-admin/storage') return { getStorage: () => instance };
    throw Error('Unexpected dependency');
  }});
  return { exports, calls };
}

test('Cloud Run uses ADC lazily and keeps named database and bound methods', () => {
  const { exports, calls } = adminModule({ FIREBASE_PROJECT_ID: 'dark-6191f', FIREBASE_STORAGE_BUCKET: 'configured-bucket' });
  assert.equal(calls.length, 0);
  assert.equal(exports.adminDb.collection('test'), 'bound');
  assert.equal(exports.adminDb.collection('test'), 'bound');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].credential.type, 'adc');
  assert.equal(calls[0].storageBucket, 'configured-bucket');
});
test('existing local credentials still work; partial credentials fail clearly', () => {
  const { exports, calls } = adminModule({ FIREBASE_PROJECT_ID: 'dark-6191f', FIREBASE_CLIENT_EMAIL: 'test@example.invalid', FIREBASE_PRIVATE_KEY: 'line1\\nline2' });
  exports.adminDb.collection('test');
  assert.equal(calls[0].credential.type, 'cert');
  assert.equal(calls[0].credential.value.privateKey, 'line1\nline2');
  const partial = adminModule({ FIREBASE_PROJECT_ID: 'dark-6191f', FIREBASE_CLIENT_EMAIL: 'partial' });
  assert.throws(() => partial.exports.adminDb.collection('test'), /both/);
});
test('web rewrites precede existing API handlers and reject malformed origins', async () => {
  const config = (await import('../next.config.mjs')).default;
  const original = process.env.API_BACKEND_URL;
  try {
    delete process.env.API_BACKEND_URL;
    assert.deepEqual(await config.rewrites(), []);
    process.env.API_BACKEND_URL = 'https://example.run.app/';
    assert.deepEqual(await config.rewrites(), { beforeFiles: [{ source: '/api/:path*', destination: 'https://example.run.app/api/:path*' }] });
    for (const invalid of ['http://example.run.app', 'https://example.run.app/api', 'https://user:pass@example.run.app']) {
      process.env.API_BACKEND_URL = invalid;
      await assert.rejects(config.rewrites());
    }
  } finally {
    if (original === undefined) delete process.env.API_BACKEND_URL; else process.env.API_BACKEND_URL = original;
  }
});
