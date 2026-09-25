import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { adminDb } from "@/lib/firebase/admin";
import { activateTrialMembershipPurchase, confirmDemoBookingPayment } from "@/lib/booking/batchAllocator";

export const runtime = "nodejs";

// ======================================================
// WEBHOOK SIGNATURE
// ======================================================

function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const expected =
    crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

  const expectedBuffer =
    Buffer.from(expected, "utf8");

  const receivedBuffer =
    Buffer.from(signature, "utf8");

  if (
    expectedBuffer.length !==
    receivedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    receivedBuffer
  );
}

// ======================================================
// POST
// ======================================================

export async function POST(
  request: NextRequest
) {
  try {
    // IMPORTANT:
    // Signature verification ke liye raw body chahiye.
    const rawBody =
      await request.text();

    const signature =
      request.headers.get(
        "x-razorpay-signature"
      );

    if (!signature) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Missing webhook signature.",
        },
        { status: 400 }
      );
    }

    const webhookSecret =
      process.env
        .RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error(
        "RAZORPAY_WEBHOOK_SECRET is not configured."
      );
    }

    // ==================================================
    // VERIFY SIGNATURE
    // ==================================================

    const valid =
      verifyWebhookSignature(
        rawBody,
        signature,
        webhookSecret
      );

    if (!valid) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid webhook signature.",
        },
        { status: 400 }
      );
    }

    // ==================================================
    // PARSE EVENT
    // ==================================================

    const payload =
      JSON.parse(rawBody);

    const event =
      payload?.event;

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid webhook payload.",
        },
        { status: 400 }
      );
    }

const db = adminDb;
    // ==================================================
    // EVENT ID
    // ==================================================

    /*
     * Razorpay webhook payloads can be delivered
     * more than once.
     *
     * Store processed event IDs so the same event
     * doesn't perform the business operation twice.
     */

    const eventId =
      request.headers.get(
        "x-razorpay-event-id"
      ) ||
      crypto
        .createHash("sha256")
        .update(rawBody)
        .digest("hex");

    const eventRef =
      db.collection("webhook_events")
        .doc(eventId);

    const existingEvent =
      await eventRef.get();

    if (existingEvent.exists && existingEvent.data()?.status === "PROCESSED") {
      return NextResponse.json({
        success: true,
        duplicate: true,
      });
    }

    // ==================================================
    // SAVE EVENT FIRST
    // ==================================================

    await eventRef.set({
      provider: "RAZORPAY",
      event,
      status: "RECEIVED",
      receivedAt: new Date(),
    }, { merge: true });

    // ==================================================
    // PAYMENT CAPTURED
    // ==================================================

    if (
      event ===
      "payment.captured"
    ) {
      await handlePaymentCaptured(
        db,
        payload
      );
    }

    // ==================================================
    // PAYMENT FAILED
    // ==================================================

    else if (
      event ===
      "payment.failed"
    ) {
      await handlePaymentFailed(
        db,
        payload
      );
    }

    // ==================================================
    // REFUND CREATED
    // ==================================================

    else if (
      event ===
      "refund.created"
    ) {
      await handleRefundCreated(
        db,
        payload
      );
    }

    // ==================================================
    // REFUND PROCESSED
    // ==================================================

    else if (
      event ===
      "refund.processed"
    ) {
      await handleRefundProcessed(
        db,
        payload
      );
    }

    // ==================================================
    // MARK PROCESSED
    // ==================================================

    await eventRef.update({
      status: "PROCESSED",
      processedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      received: true,
    });

  } catch (error) {
    console.error(
      "[RAZORPAY_WEBHOOK_ERROR]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Webhook processing failed.",
      },
      { status: 500 }
    );
  }
}

// ======================================================
// PAYMENT CAPTURED
// ======================================================

async function handlePaymentCaptured(
  db: FirebaseFirestore.Firestore,
  payload: any
) {
  const payment =
    payload?.payload?.payment?.entity;

  if (!payment) {
    throw new Error(
      "Payment entity missing."
    );
  }

  const orderId =
    payment.order_id;

  const paymentId =
    payment.id;

  if (!orderId || !paymentId) {
    throw new Error(
      "Payment/order ID missing."
    );
  }

  const paymentRef =
    db.collection("payments")
      .doc(orderId);

  const paymentSnap =
    await paymentRef.get();

  if (!paymentSnap.exists) {
    console.error(
      "Payment record not found:",
      orderId
    );

    return;
  }

  const paymentData =
    paymentSnap.data();

  if (
    Number(paymentData?.amount) * 100 !== Number(payment.amount) ||
    String(paymentData?.currency || "INR") !== String(payment.currency || "INR")
  ) {
    throw new Error("Captured payment amount/currency does not match its order.");
  }

  const bookingId =
    paymentData?.bookingId;

  if (!bookingId) {
    throw new Error(
      "Booking ID missing from payment."
    );
  }

  if (paymentData?.type === "COURSE_PURCHASE") {
    await activateTrialMembershipPurchase({ bookingId, razorpayOrderId: orderId, razorpayPaymentId: paymentId });
  } else {
    await confirmDemoBookingPayment({ bookingId, razorpayOrderId: orderId, razorpayPaymentId: paymentId });
  }

  await paymentRef.set({
    method: payment.method || null,
    capturedAt: new Date(),
    updatedAt: new Date(),
  }, { merge: true });
}

// ======================================================
// PAYMENT FAILED
// ======================================================

async function handlePaymentFailed(
  db: FirebaseFirestore.Firestore,
  payload: any
) {
  const payment =
    payload?.payload?.payment?.entity;

  if (!payment) {
    return;
  }

  const orderId =
    payment.order_id;

  const paymentId =
    payment.id;

  if (!orderId) {
    return;
  }

  const paymentRef =
    db.collection("payments")
      .doc(orderId);

  const paymentSnap =
    await paymentRef.get();

  if (!paymentSnap.exists) {
    return;
  }

  const paymentData =
    paymentSnap.data();

  const bookingId =
    paymentData?.bookingId;

  await paymentRef.set(
    {
      status: "FAILED",

      razorpayPaymentId:
        paymentId || null,

      failureReason:
        payment.error_description ||
        payment.error_reason ||
        "PAYMENT_FAILED",

      failedAt: new Date(),

      updatedAt: new Date(),
    },
    {
      merge: true,
    }
  );

  if (!bookingId || paymentData?.type === "COURSE_PURCHASE") {
    return;
  }

  await db
    .collection("demo_bookings")
    .doc(bookingId)
    .update({
      paymentStatus: "FAILED",

      updatedAt: new Date(),
    });
}

// ======================================================
// REFUND CREATED
// ======================================================

async function handleRefundCreated(
  db: FirebaseFirestore.Firestore,
  payload: any
) {
  const refund =
    payload?.payload?.refund?.entity;

  if (!refund) {
    return;
  }

  const paymentId =
    refund.payment_id;

  const refundId =
    refund.id;

  if (!paymentId || !refundId) {
    return;
  }

  await db
    .collection("refunds")
    .doc(refundId)
    .set(
      {
        id: refundId,

        provider: "RAZORPAY",

        paymentId,

        amount:
          refund.amount / 100,

        currency:
          refund.currency,

        status:
          refund.status,

        createdAt:
          new Date(),

        updatedAt:
          new Date(),
      },
      {
        merge: true,
      }
    );
}

// ======================================================
// REFUND PROCESSED
// ======================================================

async function handleRefundProcessed(
  db: FirebaseFirestore.Firestore,
  payload: any
) {
  const refund =
    payload?.payload?.refund?.entity;

  if (!refund) {
    return;
  }

  const refundId =
    refund.id;

  if (!refundId) {
    return;
  }

  await db
    .collection("refunds")
    .doc(refundId)
    .set(
      {
        status:
          refund.status,

        processedAt:
          new Date(),

        updatedAt:
          new Date(),
      },
      {
        merge: true,
      }
    );
}
