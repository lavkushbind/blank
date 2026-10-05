import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Liveness only. /api/platform-settings is the separate Firestore readiness check.
export function GET() {
  return NextResponse.json(
    { ok: true, service: "blanklearn-api" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
