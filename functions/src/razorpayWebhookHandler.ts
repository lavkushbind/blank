import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

const db = admin.firestore();

export const razorpayWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"] as string;
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "sample_webhook_secret";

    const body = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);

    // Verify HMAC SHA256 Signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("[Razorpay Webhook]: Signature mismatch.");
      res.status(400).send("Invalid signature");
      return;
    }

    const payload = req.body;
    const eventId = payload.event_id || `evt_${Date.now()}`;

    // Idempotency check: prevent duplicate enrollments
    const eventRef = db.collection("webhook_events").doc(eventId);
    const existingDoc = await eventRef.get();
    if (existingDoc.exists) {
      console.log(`[Razorpay Webhook]: Event ${eventId} already processed.`);
      res.status(200).json({ status: "already_processed" });
      return;
    }

    if (payload.event === "payment.captured" || payload.event === "order.paid") {
      const paymentEntity = payload.payload.payment.entity;
      const notes = paymentEntity.notes || {};
      const childId = notes.childId || "child_01";
      const discountApplied = Number(notes.discountApplied || 0);

      // 1. Mark event as processed
      await eventRef.set({
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentId: paymentEntity.id,
        amount: paymentEntity.amount / 100,
      });

      // 2. Unlock 30-Day Subscription for Child
      await db.collection("subscriptions").add({
        childId,
        planType: notes.planType || "MONTHLY",
        status: "ACTIVE",
        paidAmount: paymentEntity.amount / 100,
        discountApplied,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 Days
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 3. Deduct Quiz Coins if redeemed
      if (discountApplied > 0) {
        const studentRef = db.collection("students").doc(childId);
        await db.runTransaction(async (t) => {
          const sDoc = await t.get(studentRef);
          if (sDoc.exists) {
            const currentCoins = sDoc.data()?.coins || 0;
            t.update(studentRef, { coins: Math.max(0, currentCoins - discountApplied) });
          }
        });
      }

      console.log(`[Razorpay Webhook]: Subscription activated for ${childId}`);
    }

    res.status(200).json({ status: "ok" });
  } catch (error: any) {
    console.error("[Razorpay Webhook Error]:", error);
    res.status(500).send("Webhook processing error");
  }
});