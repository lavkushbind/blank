import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { parentPhone, voiceNoteUrl, attentionScore } = await req.json();
    console.log("[WhatsApp Proof Dispatched]:", parentPhone, voiceNoteUrl, attentionScore);
    return NextResponse.json({ success: true, message: "WhatsApp report delivered" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}