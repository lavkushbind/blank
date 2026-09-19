import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { toEmail, subject, htmlContent } = await req.json();
    console.log("[Email Dispatch]:", toEmail, subject);
    return NextResponse.json({ success: true, message: "Email sent" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}