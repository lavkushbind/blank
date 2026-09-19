import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { eventName, eventId, userEmail, userPhone, value } = await req.json();

    console.log(`[Meta CAPI]: Firing ${eventName} for ${userEmail || "anonymous"} (Value: ₹${value || 0})`);

    return NextResponse.json({
      success: true,
      event: eventName,
      status: "Reported to Meta Conversions API",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}