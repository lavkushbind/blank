import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const app = !getApps().length
  ? initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || "dark-6191f",
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "dark-6191f.appspot.com",
    })
  : getApps()[0];

export const adminAuth = getAuth(app);
// Connect Admin SDK to named database "dark"
export const adminDb = getFirestore(app, "dark");
export const adminStorage = getStorage(app);