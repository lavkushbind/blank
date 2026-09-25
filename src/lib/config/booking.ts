export const BOOKING_CONFIG = {
  groupCapacity: 5,

  individualCapacity: 1,

  demoDurationMinutes: 60,

  currency: "INR",

  pricing: {
    demo: 99,
  },

  supportedClassRange: {
    min: 1,
    max: 10,
  },
} as const;