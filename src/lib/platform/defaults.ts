export const defaultSettings = {
  demoFee: 99, freeDemo: false, offersEnabled: true,
  offerTitle: "", offerDescription: "", offerImage: "", offerEnabled: false,
  plans: {
    M1_D3: { months: 1, classesPerWeek: 3, regular: 1500, offer: 1500 },
    M1_D6: { months: 1, classesPerWeek: 6, regular: 2500, offer: 2500 },
    M3_D3: { months: 3, classesPerWeek: 3, regular: 4500, offer: 4200 },
    M3_D6: { months: 3, classesPerWeek: 6, regular: 7500, offer: 7000 },
    M6_D3: { months: 6, classesPerWeek: 3, regular: 9000, offer: 8100 },
    M6_D6: { months: 6, classesPerWeek: 6, regular: 15000, offer: 13500 },
  },
};
export type PlatformSettings = typeof defaultSettings;
