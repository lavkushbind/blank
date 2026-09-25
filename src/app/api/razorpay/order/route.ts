import { toPaise } from "@/lib/payments/money";
import { settings } from "@/lib/platform/server";
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {

    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(authorization.slice(7).trim());
    const pricing = await settings();
    const COURSE_PLAN_CONFIG = pricing.plans;
    const body = await request.json();
    const bookingId = typeof body.bookingId === "string" ? body.bookingId.trim() : "";
    if (!bookingId) return NextResponse.json({ success: false, message: "Booking ID is required." }, { status: 400 });

    const db = adminDb;
    const bookingRef = db.collection("demo_bookings").doc(bookingId);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) return NextResponse.json({ success: false, message: "Booking not found." }, { status: 404 });
    const booking = bookingSnap.data()!;
    if (booking.studentId !== decoded.uid) {
      return NextResponse.json({ success: false, message: "Booking access denied." }, { status: 403 });
    }

    if (booking.status === "CANCELLED") return NextResponse.json({success:false,message:"This booking was cancelled."},{status:409});
    const purchaseType = body.purchaseType === "COURSE_PURCHASE" ? "COURSE_PURCHASE" : "DEMO_BOOKING";
    const currency = body.currency || "INR";
    if (currency !== "INR") return NextResponse.json({ success: false, message: "Unsupported currency." }, { status: 400 });

    let amount: number;
    let planType: keyof typeof COURSE_PLAN_CONFIG | undefined;
    let planConfig: (typeof COURSE_PLAN_CONFIG)[keyof typeof COURSE_PLAN_CONFIG] | undefined;
    let offerApplied = false;
    if (purchaseType === "COURSE_PURCHASE") {
      if (booking.membershipStatus === "ACTIVE") return NextResponse.json({success:false,message:"This course membership is already active."},{status:409});
      const requestedPlan = body.planType as keyof typeof COURSE_PLAN_CONFIG;
      if (!Object.prototype.hasOwnProperty.call(COURSE_PLAN_CONFIG, requestedPlan)) {
        return NextResponse.json({ success: false, message: "Choose a valid course plan." }, { status: 400 });
      }
      planType = requestedPlan;
      planConfig = COURSE_PLAN_CONFIG[requestedPlan];
      const enrollmentSnap = await db.collection("enrollments").doc(`${booking.batchId}_${decoded.uid}`).get();
      const enrollment = enrollmentSnap.data();
      if (!enrollmentSnap.exists || enrollment?.bookingId !== bookingId || !["TRIAL", "ACTIVE"].includes(String(enrollment?.membershipStatus || enrollment?.status || "").toUpperCase())) {
        return NextResponse.json({ success: false, message: "An active trial is required for this purchase." }, { status: 409 });
      }
      const completedAtValue = booking.demoCompletedAt;
      const completedAt = completedAtValue && typeof completedAtValue.toDate === "function"
        ? completedAtValue.toDate().getTime()
        : completedAtValue instanceof Date ? completedAtValue.getTime() : typeof completedAtValue === "string" ? new Date(completedAtValue).getTime() : 0;
      let demoComplete = String(booking.demoStatus || "").toUpperCase() === "COMPLETED";
      if (!demoComplete) {
        const ids: string[] = Array.isArray(booking.sessionIds) ? booking.sessionIds : booking.sessionId ? [booking.sessionId] : [];
        if (ids.length >= Number(booking.demoSessionCount || 1)) {
          const sessions = await db.getAll(...ids.map(id=>db.collection("class_sessions").doc(id)));
          demoComplete = sessions.every(session=>session.exists && ["ENDED","COMPLETED"].includes(session.data()?.status));
        }
      }
      if (!demoComplete) return NextResponse.json({success:false,message:"Complete all demo sessions before purchasing a course."},{status:409});
      offerApplied = pricing.offersEnabled && demoComplete && planConfig.months > 1 && completedAt > 0 && Date.now() >= completedAt && Date.now() <= completedAt + 72 * 60 * 60 * 1000;
      amount = offerApplied ? planConfig.offer : planConfig.regular;
    } else {
      if (body.amount !== undefined && (typeof body.amount !== "number" || body.amount < 0)) {
        return NextResponse.json({ success: false, message: "Invalid amount." }, { status: 400 });
      }
      if (body.amount !== undefined && booking.finalPrice !== body.amount) {
        return NextResponse.json({ success: false, message: "Payment amount mismatch." }, { status: 400 });
      }
      amount = Number(booking.finalPrice);
      if (!Number.isFinite(amount) || amount < 0) return NextResponse.json({ success: false, message: "Invalid booking price." }, { status: 400 });
      if (amount === 0) {
        await bookingRef.update({ paymentStatus: "NOT_REQUIRED", status: "CONFIRMED", updatedAt: new Date() });
        return NextResponse.json({ success: true, free: true, bookingId });
      }
      if (booking.paymentStatus === "PAID") return NextResponse.json({ success: false, message: "Booking is already paid." }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) throw new Error("Razorpay credentials are not configured.");
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    if (purchaseType === "DEMO_BOOKING" && booking.razorpayOrderId) {
      const existing = await db.collection("payments").doc(booking.razorpayOrderId).get();
      if (existing.exists && existing.data()?.status === "CREATED" && Number(existing.data()?.amount) === amount) return NextResponse.json({success:true,free:false,bookingId,orderId:booking.razorpayOrderId,amount,currency,keyId});
    }
    const order = await razorpay.orders.create({
      amount: toPaise(amount),
      currency,
      receipt: `${purchaseType === "COURSE_PURCHASE" ? "course" : "demo"}_${bookingId}_${Date.now()}`,
      notes: { bookingId, type: purchaseType, ...(planType ? { planType, offerApplied: String(offerApplied) } : {}) },
    });

    await db.collection("payments").doc(order.id).set({
      id: order.id,
      bookingId,
      batchId: booking.batchId,
      sessionId: booking.sessionId,
      studentId: decoded.uid,
      ...(planType ? { planType } : {}),
      ...(planConfig ? { planMonths: planConfig.months, classesPerWeek: planConfig.classesPerWeek, offerApplied } : {}),
      type: purchaseType,
      provider: "RAZORPAY",
      amount,
      currency,
      status: "CREATED",
      razorpayOrderId: order.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (purchaseType === "DEMO_BOOKING") {
      await bookingRef.update({ paymentStatus: "PENDING", razorpayOrderId: order.id, updatedAt: new Date() });
    }

    return NextResponse.json({ success: true, free: false, bookingId, orderId: order.id, amount, currency, keyId });
  } catch (error) {
    console.error("[RAZORPAY_ORDER_ERROR]", error);
    return NextResponse.json({ success: false, message: "Unable to create payment order." }, { status: 500 });
  }
}
