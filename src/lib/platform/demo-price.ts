/** The promotion overrides the payable fee without changing the stored base fee. */
export function demoPrice(config: {demoFee:number;freeDemo:boolean}) {
  const finalPrice = config.freeDemo ? 0 : config.demoFee;
  return {
    originalPrice: config.demoFee,
    discount: config.demoFee - finalPrice,
    finalPrice,
    paymentRequired: finalPrice > 0,
    paymentStatus: finalPrice > 0 ? "PENDING" as const : "NOT_REQUIRED" as const,
  };
}
