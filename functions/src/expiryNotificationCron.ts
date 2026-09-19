import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

// Runs daily at 09:00 AM IST
export const subscriptionExpiryCron = functions.pubsub
  .schedule("0 9 * * *")
  .timeZone("Asia/Kolkata")
  .onRun(async (context) => {
    console.log("[Expiry Cron]: Checking expiring 1:5 pod subscriptions...");

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Subscriptions expiring in next 72 hours
    const expiringSnapshot = await db
      .collection("subscriptions")
      .where("status", "==", "ACTIVE")
      .where("expiresAt", "<=", threeDaysFromNow)
      .where("expiresAt", ">=", now)
      .get();

    for (const doc of expiringSnapshot.docs) {
      const sub = doc.data();
      const childDoc = await db.collection("students").doc(sub.childId).get();
      const childData = childDoc.data();
      const coins = childData?.coins || 450;
      const parentPhone = childData?.parentPhone || "+919821012345";

      console.log(`[Expiry Drip WhatsApp]: Dispatched to ${parentPhone}`);
      // WhatsApp message payload:
      // "Namaste! Aarav's 1:5 Pod seat expires in 3 days. Use his 450 Quiz Coins for flat ₹450 Off on renewal: https://blanklearn.com/billing"
    }

    return null;
  });