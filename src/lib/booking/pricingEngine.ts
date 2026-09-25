import { BOOKING_CONFIG } from "@/lib/config/booking";

export interface PricingInput {
  couponCode?: string;
}

export interface PricingResult {
  currency: "INR";

  originalPrice: number;
  discount: number;
  finalPrice: number;

  couponCode?: string;

  paymentRequired: boolean;
}

// ======================================================
// COUPONS
// ======================================================

interface Coupon {
  code: string;
  type: "FIXED" | "PERCENTAGE";
  value: number;
  active: boolean;
  maxDiscount?: number;
}

/*
 * Temporary configuration.
 *
 * Production me coupons Firestore ke
 * `coupons` collection se aayenge.
 */

const COUPONS: Coupon[] = [
  {
    code: "WELCOME",
    type: "FIXED",
    value: 99,
    active: true,
  },

  {
    code: "BL50",
    type: "PERCENTAGE",
    value: 50,
    maxDiscount: 99,
    active: true,
  },
];

// ======================================================
// MAIN PRICE CALCULATOR
// ======================================================

export function calculateDemoPrice(
  input: PricingInput = {}
): PricingResult {
  const originalPrice =
    BOOKING_CONFIG.pricing.demo;

  let discount = 0;

  let normalizedCoupon:
    | string
    | undefined;

  // ----------------------------------------------------
  // COUPON
  // ----------------------------------------------------

  if (input.couponCode) {
    normalizedCoupon =
      input.couponCode
        .trim()
        .toUpperCase();

    const coupon =
      COUPONS.find(
        (item) =>
          item.code ===
            normalizedCoupon &&
          item.active
      );

    if (coupon) {
      if (coupon.type === "FIXED") {
        discount = coupon.value;
      }

      if (
        coupon.type === "PERCENTAGE"
      ) {
        discount =
          (originalPrice *
            coupon.value) /
          100;

        if (
          coupon.maxDiscount !==
          undefined
        ) {
          discount = Math.min(
            discount,
            coupon.maxDiscount
          );
        }
      }
    }
  }

  // ----------------------------------------------------
  // SAFETY
  // ----------------------------------------------------

  discount = Math.max(
    0,
    Math.min(
      discount,
      originalPrice
    )
  );

  const finalPrice =
    Math.max(
      0,
      originalPrice - discount
    );

  return {
    currency: "INR",

    originalPrice,

    discount,

    finalPrice,

    couponCode:
      normalizedCoupon,

    paymentRequired:
      finalPrice > 0,
  };
}

// ======================================================
// VALIDATE COUPON
// ======================================================

export function validateCoupon(
  couponCode?: string
): {
  valid: boolean;
  discount: number;
  message: string;
} {
  if (!couponCode?.trim()) {
    return {
      valid: false,
      discount: 0,
      message:
        "Coupon code is required.",
    };
  }

  const code =
    couponCode
      .trim()
      .toUpperCase();

  const coupon =
    COUPONS.find(
      (item) =>
        item.code === code &&
        item.active
    );

  if (!coupon) {
    return {
      valid: false,
      discount: 0,
      message:
        "Invalid or expired coupon.",
    };
  }

  const pricing =
    calculateDemoPrice({
      couponCode: code,
    });

  return {
    valid: true,
    discount: pricing.discount,
    message:
      pricing.finalPrice === 0
        ? "Demo is completely free."
        : "Coupon applied successfully.",
  };
}

// ======================================================
// FORMAT PRICE
// ======================================================

export function formatINR(
  amount: number
): string {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }
  ).format(amount);
}