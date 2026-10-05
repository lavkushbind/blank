import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function getAdminApp() {
  const existing = getApps()[0];
  if (existing) return existing;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID must identify the existing Firebase project.");
  }
  if (Boolean(clientEmail) !== Boolean(privateKey)) {
    throw new Error(
      "Set both FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY, or neither to use the Cloud Run service identity."
    );
  }

  return initializeApp({
        credential: clientEmail && privateKey ? cert({
          projectId,
          clientEmail,
          privateKey,
        }) : applicationDefault(),
        projectId,
        storageBucket:
          process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
          `${projectId}.appspot.com`,
      });
}

// Initialize inside route handlers so credential errors reach their JSON error handlers.
function lazyService<T extends object>(create: () => T): T {
  let service: T | undefined;
  return new Proxy({} as T, {
    get(_target, key) {
      const instance = service ??= create();
      const value = Reflect.get(instance, key, instance);
      return typeof value === "function" ? value.bind(instance) : value;
    },
  });
}

export const adminAuth = lazyService(() => getAuth(getAdminApp()));
// Keep the existing named Firestore database.
export const adminDb = lazyService(() => getFirestore(getAdminApp(), "dark"));
export const adminStorage = lazyService(() => getStorage(getAdminApp()));
