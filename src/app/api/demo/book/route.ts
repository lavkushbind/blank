import { NextRequest, NextResponse } from "next/server";
import { allocateDemoPod } from "@/lib/booking/demoEngine";
import Razorpay from "razorpay";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentName, parentPhone, gradeNumber, board, subject, demoType, bookingDate, slotTime } = body;

    // Strict Validation
    if (!studentName || !parentPhone || !gradeNumber || !board || !subject || !demoType || !bookingDate || !slotTime) {
      return NextResponse.json({ error: "Missing required booking parameters" }, { status: 400 });
    }

    if (gradeNumber < 1 || gradeNumber > 10) {
      return NextResponse.json({ error: "Class must be between 1 and 10" }, { status: 400 });
    }

    // Backend Pricing Evaluation (Never trust frontend)
    const isOfferActive = process.env.NEXT_PUBLIC_DEMO_OFFER_ACTIVE === "true";
    const payableAmount = isOfferActive ? 0 : 99;

    // 1. ₹0 Case: Direct allocation without Razorpay
    if (payableAmount === 0) {
      const allocation = await allocateDemoPod(body);
      return NextResponse.json({
        success: true,
        isFree: true,
        payableAmount: 0,
        allocation,
      });
    }

    // 2. ₹99 Case: Create Razorpay Order with Live Key
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || "rzp_live_6vd9RApruseTAi",
      key_secret: process.env.RAZORPAY_KEY_SECRET || "dummy_secret",
    });

    const order = await razorpay.orders.create({
      amount: payableAmount * 100, // paise (9900 paise = ₹99)
      currency: "INR",
      receipt: `demo_${Date.now()}`,
      notes: {
        studentName,
        parentPhone,
        grade: String(gradeNumber),
        board,
        subject,
        demoType,
      },
    });

    return NextResponse.json({
      success: true,
      isFree: false,
      payableAmount: 99,
      orderId: order.id,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_live_6vd9RApruseTAi",
    });
  } catch (error: any) {
    console.error("[Demo Booking API Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to process booking" }, { status: 500 });
  }
}