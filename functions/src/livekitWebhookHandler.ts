import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { WebhookReceiver } from "livekit-server-sdk";

const db = admin.firestore();

export const livekitWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
    const authHeader = req.headers["authorization"] || "";

    const receiver = new WebhookReceiver(
      process.env.LIVEKIT_API_KEY || "devkey",
      process.env.LIVEKIT_API_SECRET || "secret"
    );

    const event = await receiver.receive(rawBody, authHeader as string);
    const roomName = event.room?.name || "unknown";

    console.log(`[LiveKit Webhook]: Event ${event.event} for room ${roomName}`);

    if (event.event === "room_started") {
      // Mark batch as LIVE in database
      await db.collection("active_classes").doc(roomName).set(
        {
          status: "LIVE",
          startedAt: admin.firestore.FieldValue.serverTimestamp(),
          participants: [],
        },
        { merge: true }
      );
    } else if (event.event === "participant_joined") {
      const participantId = event.participant?.identity || "unknown";
      // Record attendance join log
      await db.collection("attendance_logs").add({
        roomName,
        participantId,
        event: "JOINED",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else if (event.event === "room_finished") {
      // Class completed: Close session & credit teacher payout (+₹650)
      const sessionDoc = await db.collection("active_classes").doc(roomName).get();
      if (sessionDoc.exists) {
        const teacherId = sessionDoc.data()?.teacherId || "teacher_rahul";
        
        // Add ₹650 to Teacher Wallet Ledger
        await db.collection("teacher_ledger").add({
          teacherId,
          batchId: roomName,
          amount: 650,
          description: `Completed 1:5 Class for Batch #${roomName}`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          type: "CREDIT",
        });

        await db.collection("active_classes").doc(roomName).update({
          status: "COMPLETED",
          endedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("[LiveKit Webhook Error]:", error);
    res.status(400).send("Webhook verification failed");
  }
});