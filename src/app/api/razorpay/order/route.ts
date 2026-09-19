import { NextRequest, NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay/client";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  try {
    const { baseAmount, useCoins, planType, childId, parentEmail } = await req.json();

    let coinDiscount = 0;

    // 1. Fetch real student coin balance securely from Firestore Admin
    if (useCoins && childId) {
      const studentDoc = await adminDb.collection("students").doc(childId).get();
      if (studentDoc.exists) {
        const availableCoins = studentDoc.data()?.coins || 0;
        // 1 Coin = 1 Rupee discount (Max discount capped at 50% of base amount)
        coinDiscount = Math.min(availableCoins, Math.floor(baseAmount * 0.5));
      }
    }

    const finalPayable = Math.max(baseAmount - coinDiscount, 100); // Minimum ₹100

    // 2. Create Razorpay Order
    const order = await razorpay.orders.create({
      amount: finalPayable * 100, // paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: {
        childId,
        planType,
        coinDiscountApplied: coinDiscount,
        parentEmail: parentEmail || "parent@blanklearn.com",
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      baseAmount,
      coinDiscountApplied: coinDiscount,
      finalPayable,
    });
  } catch (error: any) {
    console.error("[Razorpay Order Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to create order" }, { status: 500 });
  }
}