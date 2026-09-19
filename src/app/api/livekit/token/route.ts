import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomName, participantIdentity, participantName, role } = body;

    const apiKey = process.env.LIVEKIT_API_KEY || "APIZE3LUQVSbCcc";
    const apiSecret = process.env.LIVEKIT_API_SECRET || "5jlhpXmCazntx9Yj8lEDxx8dJfTPs2NyHrMW7IhIlYf";
    const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://blank-6hk49601.livekit.cloud";

    // Instant local cryptographic minting (Takes < 5ms, Zero network lag)
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity || `user_${Date.now()}`,
      name: participantName || "Pod Member",
      ttl: "4h",
      metadata: JSON.stringify({ role: role || "student", name: participantName }),
    });

    at.addGrant({
      roomJoin: true,
      room: roomName || "batch-demo-101",
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: role === "teacher",
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      serverUrl,
      roomName: roomName || "batch-demo-101",
    });
  } catch (error: any) {
    console.error("[Instant Token Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}