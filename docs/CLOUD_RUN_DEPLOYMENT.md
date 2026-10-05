# Cloud Run backend deployment

The API keeps its existing Next.js handlers and now runs as a standalone Node container. Firebase remains project `dark-6191f`, Firestore database `dark`. No data migration or legacy Functions deployment is involved.

## Live deployment ? 28 September 2026

Backend: https://blanklearn-api-yhxglez5qa-el.a.run.app

```text
Android API_BASE_URL=https://blanklearn-api-yhxglez5qa-el.a.run.app/
Web API_BACKEND_URL=https://blanklearn-api-yhxglez5qa-el.a.run.app
```

Cloud Build and deployment completed; live health and platform-settings checks passed against the existing database. Website environment/redeployment, Android configuration, provider webhook cutover and authenticated account/payment/classroom checks are not completed by this repository deployment.

Read-only smoke checks: `node scripts/smoke-cloud-run.mjs https://blanklearn-api-yhxglez5qa-el.a.run.app`.

## Deployment

Run from the repository root with Node 22 and an authenticated Google Cloud CLI account authorized to enable APIs, create service accounts/IAM bindings, deploy Cloud Run and manage project secrets. Billing must already be enabled.

```sh
node scripts/deploy-cloud-run.mjs
```

On Windows with the portable SDK, set `GCLOUD_SDK_ROOT` to its `google-cloud-sdk` directory (the distribution with bundled Python). Otherwise run from Google Cloud Shell or a shell with `gcloud` available.

The script uses `.env.local` or environment values for LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and optionally RAZORPAY_WEBHOOK_SECRET. Values are sent to Secret Manager through stdin, never command-line arguments or build args. Firebase private keys are not uploaded. Source upload and Docker build use allowlists that exclude env files and local credentials. Inspect `gcloud meta list-files-for-upload` before changing these allowlists.

The script creates dedicated runtime/build service accounts, grants database access and Firebase Auth read access, bucket-scoped object access, self-scoped remote signing for signed file URLs, and per-secret read access. It deploys to `asia-south1` with 0 minimum and 3 maximum instances, 1 CPU/1 GiB per instance. The normal Google Cloud billing rates apply. Secret versions are pinned per revision. Redeploying adds versions of supplied secrets.

Public invocation is intentional: Android Firebase tokens and provider webhook signatures are verified inside existing handlers. Cloud Run IAM authentication is not a replacement for Firebase authentication. Existing public API routes remain public. Review existing route authorization separately from this hosting migration.

The runtime uses Application Default Credentials from its attached service account, FIREBASE_PROJECT_ID and FIREBASE_STORAGE_BUCKET. `dark` remains fixed in the server code. Existing complete local credential pairs still work for local development. Partial pairs fail clearly.

BACKEND_ONLY=true hides application pages on the backend origin. The container still builds the shared Next.js project so existing API imports are preserved. It is an API deployment, not a replacement web frontend build. Never set API_BACKEND_URL on the Cloud Run service; doing so would proxy back into itself.

DEMO_OFFER_ACTIVE is a runtime fallback for the existing free-demo promotion. Saved platform settings still override it. NEXT_PUBLIC values are build-time values and should not be used for new runtime backend configuration.

## Cutover

After live health/readiness checks pass:

1. Android: set API_BASE_URL to the returned Cloud Run HTTPS origin with trailing slash. Keep existing `/api/...` paths and Firebase Bearer tokens. Firebase project/database remain unchanged.
2. Website: set API_BACKEND_URL on the web deployment to the returned origin (no `/api` suffix), then rebuild/redeploy the website. The beforeFiles rewrite forwards all `/api/*`, including binary uploads, query strings and image URLs, before local handlers. Existing browser callers stay same-origin, so a new wildcard CORS policy is unnecessary.
3. Razorpay: configure `/api/razorpay/webhook` on the new origin using the matching Secret Manager signing secret. If no secret existed locally, deployment generates one. Retrieve it securely in the Google Cloud console, not in logs/chat. Do not enable duplicate payment consumers without checking event idempotency.
4. LiveKit: point provider events to `/api/livekit/webhook`. The existing handler verifies/logs events; migration does not add attendance/payout automation.
5. Verify authenticated demo booking, payment verification in provider test mode, LiveKit joins, help chat and Storage upload/signed URLs with test accounts. Do not create live charges merely to smoke-test deployment.

GET /api/health is liveness only. GET /api/platform-settings also exercises Firestore access. Neither proves all authenticated user journeys work. The script checks both and prints the actual URL after deployment.

## Validation and rollback

```sh
node --test scripts/test-cloud-run.cjs
npm run typecheck
npm run build
```

The repository's earlier edits are retained. Deployment does not run old `functions/src` handlers, migrate Firestore documents, change pricing documents or change Firebase client security rules.

To roll back routing, remove API_BACKEND_URL from the web environment and rebuild the previous web revision; restore Android's prior base URL if needed. For a backend code rollback, direct Cloud Run traffic to the previous known-good revision and retain its pinned secret versions. Coordinate webhook URLs to avoid inconsistent payment consumers.

References: [Next standalone output](https://nextjs.org/docs/15/app/api-reference/config/next-config-js/output), [Cloud Run source deployment](https://docs.cloud.google.com/run/docs/deploying-source-code), [service identity](https://docs.cloud.google.com/run/docs/securing/service-identity), [Secret Manager integration](https://docs.cloud.google.com/run/docs/configuring/services/secrets).
