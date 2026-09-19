import { AccessToken } from "livekit-server-sdk";

export async function createLiveKitToken({
  roomName,
  participantIdentity,
  participantName,
  role,
}: {
  roomName: string;
  participantIdentity: string;
  participantName: string;
  role: "teacher" | "student" | "observer";
}) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("LiveKit credentials not configured in environment.");
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantIdentity,
    name: participantName,
    ttl: "2h",
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: role !== "observer",
    canSubscribe: true,
    canPublishData: true,
  });

  return await at.toJwt();
}
