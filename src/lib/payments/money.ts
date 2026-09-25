/** Razorpay amounts use the smallest currency unit; stored prices use rupees. */
export function toPaise(rupees: number): number {
  if (!Number.isFinite(rupees) || rupees < 0 || rupees > 1000000) throw new Error("Invalid payment amount");
  return Math.round(rupees * 100);
}
