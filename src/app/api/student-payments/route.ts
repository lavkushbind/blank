import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.cookies.get("__session")?.value;
    if (!token) return NextResponse.json({ success: false, message: "Sign in to view payment history." }, { status: 401 });
    const user = await adminAuth.verifyIdToken(token);
    const snapshot = await adminDb.collection("payments").where("studentId", "==", user.uid).limit(100).get();
    const payments = snapshot.docs.map((item) => {
      const data = item.data();
      return { id: item.id, bookingId: data.bookingId || null, amount: Number(data.amount) || 0, currency: data.currency || "INR", type: data.type || "PAYMENT", planType: data.planType || null, status: data.status || "UNKNOWN", paymentId: data.razorpayPaymentId || null, createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null };
    }).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return NextResponse.json({ success: true, payments });
  } catch (error) {
    console.error("Student payment history failed", error);
    return NextResponse.json({ success: false, message: "Payment history could not be loaded." }, { status: 500 });
  }
}
