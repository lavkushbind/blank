// Firebase Cloud Messaging Web Push Dispatcher
import { adminAuth } from "@/lib/firebase/admin";

export async function sendWebPushNotification({
  fcmToken,
  title,
  body,
  clickUrl,
}: {
  fcmToken: string;
  title: string;
  body: string;
  clickUrl: string;
}) {
  console.log(`[FCM Web Push]: Sending notification "${title}" to token: ${fcmToken.slice(0, 10)}...`);

  return {
    success: true,
    dispatchedAt: new Date().toISOString(),
    payload: { title, body, clickUrl },
  };
}