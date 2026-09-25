import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { success: false, message: "Push notifications are not configured yet." },
    { status: 503 },
  );
}
