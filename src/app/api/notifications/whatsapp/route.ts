import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { success: false, message: "WhatsApp delivery is not configured yet." },
    { status: 503 },
  );
}
