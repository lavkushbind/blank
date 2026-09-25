import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { activateTrialMembershipPurchase, confirmDemoBookingPayment } from "@/lib/booking/batchAllocator";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest
) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(authorization.slice(7).trim());

    // ==============================================
    // BODY
    // ==============================================

    const body =
      await request.json();

    const {
      bookingId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = body;

    // ==============================================
    // VALIDATION
    // ==============================================

    if (
      !bookingId ||
      !razorpayOrderId ||
      !razorpayPaymentId ||
      !razorpaySignature
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Incomplete payment verification data.",
        },
        {
          status: 400,
        }
      );
    }

    // ==============================================
    // BOOKING
    // ==============================================

    const bookingRef =
      adminDb
        .collection("demo_bookings")
        .doc(bookingId);

    const bookingSnap =
      await bookingRef.get();

    if (!bookingSnap.exists) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Booking not found.",
        },
        {
          status: 404,
        }
      );
    }

    // Explicitly guard against undefined.
    const booking =
      bookingSnap.data();

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Booking data could not be loaded.",
        },
        {
          status: 404,
        }
      );
    }

    if (booking.studentId !== decoded.uid) {
      return NextResponse.json({ success: false, message: "Booking access denied." }, { status: 403 });
    }

    const orderPaymentRef = adminDb.collection("payments").doc(razorpayOrderId);
    const orderPaymentSnap = await orderPaymentRef.get();
    if (!orderPaymentSnap.exists) return NextResponse.json({ success: false, message: "Payment order not found." }, { status: 404 });
    const orderPayment = orderPaymentSnap.data()!;
    if (orderPayment.bookingId !== bookingId || orderPayment.studentId !== decoded.uid) {
      return NextResponse.json({ success: false, message: "Payment order access denied." }, { status: 403 });
    }

    // ==============================================
    // ORDER MATCH
    // ==============================================

    if (orderPayment.type !== "COURSE_PURCHASE" && booking.razorpayOrderId !== razorpayOrderId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment order mismatch.",
        },
        {
          status: 400,
        }
      );
    }

    // ==============================================
    // ALREADY PAID
    // ==============================================

    if (orderPayment.type !== "COURSE_PURCHASE" && booking.paymentStatus === "PAID") {
      return NextResponse.json({
        success: true,

        alreadyVerified: true,

        bookingId,

        paymentStatus: "PAID",

        bookingStatus:
          booking.status,
      });
    }

    // ==============================================
    // SECRET
    // ==============================================

    const secret =
      process.env
        .RAZORPAY_KEY_SECRET;

    if (!secret) {
      throw new Error(
        "RAZORPAY_KEY_SECRET is not configured."
      );
    }

    // ==============================================
    // SIGNATURE
    // ==============================================

    const generatedSignature =
      crypto
        .createHmac(
          "sha256",
          secret
        )
        .update(
          `${razorpayOrderId}|${razorpayPaymentId}`
        )
        .digest("hex");

    const expectedBuffer =
      Buffer.from(
        generatedSignature,
        "utf8"
      );

    const receivedBuffer =
      Buffer.from(
        String(
          razorpaySignature
        ),
        "utf8"
      );

    if (
      expectedBuffer.length !==
      receivedBuffer.length
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment verification failed.",
        },
        {
          status: 400,
        }
      );
    }

    const signatureValid =
      crypto.timingSafeEqual(
        expectedBuffer,
        receivedBuffer
      );

    if (!signatureValid) {
      await adminDb
        .collection("payments")
        .doc(razorpayOrderId)
        .set(
          {
            status: "FAILED",

            failureReason:
              "INVALID_SIGNATURE",

            updatedAt:
              new Date(),
          },
          {
            merge: true,
          }
        );

      return NextResponse.json(
        {
          success: false,
          message:
            "Payment verification failed.",
        },
        {
          status: 400,
        }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    if (!keyId) throw new Error("RAZORPAY_KEY_ID is not configured.");

    const razorpay = new Razorpay({ key_id: keyId, key_secret: secret });
    const payment = await razorpay.payments.fetch(razorpayPaymentId);
    if (
      payment.order_id !== razorpayOrderId ||
      payment.status !== "captured" ||
      payment.amount !== Math.round(Number(orderPayment.amount) * 100) ||
      payment.currency !== (orderPayment.currency || "INR")
    ) {
      return NextResponse.json(
        { success: false, message: "Payment is not captured for the expected amount." },
        { status: 409 },
      );
    }

    // ==============================================
    // PAYMENT REF
    // ==============================================

    if (orderPayment.type === "COURSE_PURCHASE") {
      await activateTrialMembershipPurchase({ bookingId, razorpayOrderId, razorpayPaymentId });
    } else {
      if (Number(orderPayment.amount) !== Number(booking.finalPrice)) {
        return NextResponse.json({ success: false, message: "Payment amount mismatch." }, { status: 409 });
      }
      await confirmDemoBookingPayment({ bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature });
    }

    // ==============================================
    // SUCCESS
    // ==============================================

    return NextResponse.json({
      success: true,

      bookingId,

      paymentStatus: "PAID",

      bookingStatus: "CONFIRMED",
      membershipStatus: orderPayment.type === "COURSE_PURCHASE" ? "ACTIVE" : "TRIAL",
    });

  } catch (error) {
    console.error(
      "[RAZORPAY_VERIFY_ERROR]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to verify payment.",
      },
      {
        status: 500,
      }
    );
  }
}
