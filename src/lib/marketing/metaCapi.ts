// Server-Side Meta Conversions API (CAPI) Client
import crypto from "crypto";

export async function sendMetaCapiEvent({
  eventName,
  eventSourceUrl,
  userEmail,
  userPhone,
  value = 0,
  currency = "INR",
}: {
  eventName: "Lead" | "Schedule" | "InitiateCheckout" | "Purchase";
  eventSourceUrl: string;
  userEmail?: string;
  userPhone?: string;
  value?: number;
  currency?: string;
}) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    console.warn("[Meta CAPI]: Pixel ID or Access Token not configured.");
    return { skipped: true };
  }

  // Hash user email and phone (SHA-256) as required by Meta policy
  const hash = (data: string) => crypto.createHash("sha256").update(data.trim().toLowerCase()).digest("hex");

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_source_url: eventSourceUrl,
        user_data: {
          em: userEmail ? [hash(userEmail)] : [],
          ph: userPhone ? [hash(userPhone.replace(/\D/g, ""))] : [],
        },
        custom_data: {
          currency,
          value,
        },
      },
    ],
  };

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (error) {
    console.error("[Meta CAPI Error]:", error);
    return { error };
  }
}