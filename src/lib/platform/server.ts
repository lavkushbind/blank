import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { defaultSettings, PlatformSettings } from "./defaults";
export async function identity(request: NextRequest, admin = false) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) throw new Error("UNAUTHORIZED");
  let user;
  try { user = await adminAuth.verifyIdToken(token, true); } catch { throw new Error("UNAUTHORIZED"); }
  if (admin && user.admin !== true) throw new Error("FORBIDDEN");
  return user;
}
export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed";
  const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : message.startsWith("Invalid") ? 400 : message === "RATE_LIMIT" ? 429 : 500;
  if (status === 500) console.error("Platform API error", error);
  return NextResponse.json({ message: status === 500 ? "Unable to complete request. Please retry." : message }, { status });
}
export async function settings(): Promise<PlatformSettings> {
  const snapshot = await adminDb.collection("platform_settings").doc("public").get();
  return { ...defaultSettings, freeDemo: (process.env.DEMO_OFFER_ACTIVE ?? process.env.NEXT_PUBLIC_DEMO_OFFER_ACTIVE) === "true", ...snapshot.data(), plans: { ...defaultSettings.plans, ...snapshot.data()?.plans } };
}
