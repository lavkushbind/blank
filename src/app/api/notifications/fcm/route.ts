import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { token, title, body } = await req.json();
    console.log("[FCM Push]: Sending to token", token, title, body);
    return NextResponse.json({ success: true, message: "Push notification dispatched" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}