import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDkAbUlYv7SeA08-JFxFbkHaF_tlpbRIMw",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "dark-6191f.firebaseapp.com",
  databaseURL: "https://dark-6191f-default-rtdb.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dark-6191f",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "dark-6191f.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "730022278030",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:730022278030:web:e5a2754692f94dc073aadf",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// EXACT SCREENSHOT FIX: Connect directly to database named "dark"
export const db = getFirestore(app, "dark");

export const storage = getStorage(app);
export const realtimeDb = getDatabase(app);
export default app;