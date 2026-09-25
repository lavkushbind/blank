import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { success: false, message: "Meta conversion reporting is not configured." },
    { status: 503 },
  );
}
