import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = 'dark-6191f';
const region = 'asia-south1';
const service = 'blanklearn-api';
const runtimeAccount = `${service}@${project}.iam.gserviceaccount.com`;
const buildAccount = `blanklearn-build@${project}.iam.gserviceaccount.com`;
const envFile = path.join(root, '.env.local');
const local = existsSync(envFile) ? dotenv.parse(readFileSync(envFile)) : {};
const value = key => process.env[key] || local[key];
const sdk = process.env.GCLOUD_SDK_ROOT;
const executable = sdk && process.platform === 'win32'
  ? path.join(sdk, 'platform', 'bundledpython', 'python.exe') : 'gcloud';
const prefix = sdk && process.platform === 'win32' ? [path.join(sdk, 'lib', 'gcloud.py')] : [];

function cloud(args, { input, optional = false } = {}) {
  const result = spawnSync(executable, [...prefix, ...args, `--project=${project}`, '--quiet'], {
    cwd: root, encoding: 'utf8', input, maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, CLOUDSDK_CORE_DISABLE_PROMPTS: '1' },
    // Capture output; never echo command arguments or secret input.
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (result.error) throw new Error(`Google Cloud CLI unavailable: ${result.error.code}. Install gcloud or set GCLOUD_SDK_ROOT on Windows.`);
  if (result.status !== 0) {
    if (optional) return null;
    throw new Error(`${args.slice(0, 3).join(' ')} failed: ${result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

async function main() {
  const expectedProject = value('FIREBASE_PROJECT_ID');
  if (expectedProject && expectedProject !== project) throw new Error('Local Firebase project differs from dark-6191f. Deployment stopped.');
  const required = ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'];
  for (const key of required) if (!value(key)?.trim()) throw new Error(`${key} is missing. Set it in .env.local or the shell environment.`);
  if (new URL(value('LIVEKIT_URL')).protocol !== 'wss:') throw new Error('LIVEKIT_URL must use wss://.');
  const billing = JSON.parse(cloud(['billing', 'projects', 'describe', project, '--format=json']));
  if (!billing.billingEnabled) throw new Error('Billing must already be enabled on the existing project.');

  console.log('Enabling Cloud Run build, secrets and service-identity APIs...');
  cloud(['services', 'enable', 'run.googleapis.com', 'cloudbuild.googleapis.com', 'artifactregistry.googleapis.com', 'secretmanager.googleapis.com', 'iam.googleapis.com', 'iamcredentials.googleapis.com', 'firestore.googleapis.com', 'identitytoolkit.googleapis.com']);
  for (const [id, email] of [[service, runtimeAccount], ['blanklearn-build', buildAccount]]) {
    if (cloud(['iam', 'service-accounts', 'describe', email, '--format=value(email)'], { optional: true }) === null) {
      cloud(['iam', 'service-accounts', 'create', id, `--display-name=${id}`]);
    }
  }
  for (const role of ['roles/datastore.user', 'roles/firebaseauth.viewer']) {
    cloud(['projects', 'add-iam-policy-binding', project, `--member=serviceAccount:${runtimeAccount}`, `--role=${role}`, '--condition=None']);
  }
  cloud(['projects', 'add-iam-policy-binding', project, `--member=serviceAccount:${buildAccount}`, '--role=roles/run.builder', '--condition=None']);
  const bucket = value('FIREBASE_STORAGE_BUCKET') || value('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET') || `${project}.appspot.com`;
  if (!/^[a-z0-9][a-z0-9._-]+$/.test(bucket)) throw new Error('Invalid storage bucket name.');
  cloud(['storage', 'buckets', 'add-iam-policy-binding', `gs://${bucket}`, `--member=serviceAccount:${runtimeAccount}`, '--role=roles/storage.objectUser']);
  // Signed Storage URLs require remote signing when no private key is installed.
  cloud(['iam', 'service-accounts', 'add-iam-policy-binding', runtimeAccount, `--member=serviceAccount:${runtimeAccount}`, '--role=roles/iam.serviceAccountTokenCreator', '--condition=None']);

  console.log('Saving only provider secrets to Secret Manager (values are never logged)...');
  const mappings = [];
  for (const key of [...required, 'RAZORPAY_WEBHOOK_SECRET']) {
    const secret = `blanklearn-${key.toLowerCase().replaceAll('_', '-')}`;
    const existing = cloud(['secrets', 'describe', secret, '--format=value(name)'], { optional: true });
    if (existing === null) cloud(['secrets', 'create', secret, '--replication-policy=automatic']);
    let content = value(key)?.trim();
    if (!content && key === 'RAZORPAY_WEBHOOK_SECRET' && existing === null) {
      content = randomBytes(32).toString('hex');
      console.log('Generated webhook signing secret. Configure the matching value in Razorpay before enabling the new webhook.');
    }
    let version;
    if (content) {
      version = cloud(['secrets', 'versions', 'add', secret, '--data-file=-', '--format=value(name)'], { input: content }).split('/').at(-1);
    } else {
      version = cloud(['secrets', 'versions', 'list', secret, '--filter=state:ENABLED', '--sort-by=~createTime', '--limit=1', '--format=value(name)']).split('/').at(-1);
      if (!version) throw new Error(`No enabled version for ${secret}`);
    }
    cloud(['secrets', 'add-iam-policy-binding', secret, `--member=serviceAccount:${runtimeAccount}`, '--role=roles/secretmanager.secretAccessor', '--condition=None']);
    mappings.push(`${key}=${secret}:${version}`);
  }

  // Check the actual gcloud upload manifest before uploading any source.
  const manifest = cloud(['meta', 'list-files-for-upload']).split(/\r?\n/);
  for (const file of manifest) {
    if (/(^|[/\\])\.env|\.pem$|service-account.*\.json$|credentials.*\.json$/i.test(file)) throw new Error('Source manifest contains a credential file; upload stopped.');
  }
  for (const requiredFile of ['Dockerfile', 'package-lock.json', 'src/app/api/health/route.ts']) {
    if (!manifest.some(file => file.replaceAll('\\', '/').replace(/^\.\//, '') === requiredFile)) throw new Error(`Source manifest is missing ${requiredFile}`);
  }
  console.log(`Building and deploying ${service} in ${region}; this may take several minutes...`);
  cloud(['run', 'deploy', service, '--source=.', `--region=${region}`, `--service-account=${runtimeAccount}`,
    `--build-service-account=projects/${project}/serviceAccounts/${buildAccount}`,
    '--allow-unauthenticated', '--port=8080', '--memory=1Gi', '--cpu=1', '--concurrency=20',
    '--min-instances=0', '--max-instances=3', '--timeout=120',
    `--set-env-vars=FIREBASE_PROJECT_ID=${project},FIREBASE_STORAGE_BUCKET=${bucket},BACKEND_ONLY=true,DEMO_OFFER_ACTIVE=${value('NEXT_PUBLIC_DEMO_OFFER_ACTIVE') === 'true' ? 'true' : 'false'}`,
    `--set-secrets=${mappings.join(',')}`]);
  const url = cloud(['run', 'services', 'describe', service, `--region=${region}`, '--format=value(status.url)']);
  console.log(`Backend deployed: ${url}`);
  console.log(`Android API_BASE_URL: ${url}/`);
  console.log(`Web API_BACKEND_URL: ${url} (rebuild the web deployment after setting it)`);
  for (const endpoint of ['/api/health', '/api/platform-settings']) {
    const response = await fetch(`${url}${endpoint}`);
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error(`Readiness check failed: ${endpoint}, HTTP ${response.status}`);
    await response.json();
    console.log(`PASS ${endpoint}`);
  }
  console.log(`Razorpay webhook: ${url}/api/razorpay/webhook`);
  console.log(`LiveKit webhook: ${url}/api/livekit/webhook`);
  console.log('Provider webhook configuration and authenticated booking/payment/classroom smoke tests are still required before traffic cutover.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
