import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export { autoBatchMatchmaker } from "./batchMatchmaker";
export { livekitWebhook } from "./livekitWebhookHandler";
export { razorpayWebhook } from "./razorpayWebhookHandler";
export { subscriptionExpiryCron } from "./expiryNotificationCron";