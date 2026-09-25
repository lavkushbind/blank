import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim().slice(0, 100);
    const email = String(body.email || "").trim().slice(0, 200);
    const phone = String(body.phone || "").trim().slice(0, 30);
    const message = String(body.message || "").trim().slice(0, 3000);
    if (String(body.website || "").trim()) return NextResponse.json({ success: true });
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || phone.length < 7 || message.length < 10) {
      return NextResponse.json({ success: false, message: "Enter your name, a valid email and phone number, and a message of at least 10 characters." }, { status: 400 });
    }
    const ref = adminDb.collection("support_tickets").doc();
    await ref.set({ name, email, phone, message, status: "OPEN", source: "CONTACT_FORM", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, ticketId: ref.id });
  } catch (error) {
    console.error("Contact ticket creation failed", error);
    return NextResponse.json({ success: false, message: "We could not save your request. Please try again." }, { status: 500 });
  }
}
