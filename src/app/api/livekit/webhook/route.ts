import { NextRequest, NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) {
      return NextResponse.json({ success: false, message: "LiveKit webhook is not configured." }, { status: 503 });
    }
    const rawBody = await req.text();
    const authHeader = req.headers.get("Authorization");

    const receiver = new WebhookReceiver(
      apiKey,
      apiSecret
    );

    // LiveKit SDK me receive() async hota hai
    const event = await receiver.receive(rawBody, authHeader || "");
    console.log("[LiveKit Webhook Event]:", event.event);

    if (event.event === "room_finished") {
      console.log(`Room ${event.room?.name} completed.`);
    }

    return NextResponse.json({ success: true, event: event.event });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Webhook error" }, { status: 400 });
  }
}
