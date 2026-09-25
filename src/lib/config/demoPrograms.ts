export const DEMO_PROGRAMS = [
  {
    id: "MATH_ONLY",
    name: "Only Math",
    shortName: "Math",
    description: "Focused live Mathematics demo class.",
    subjects: ["MATH"],
    durationMinutes: 60,
    active: true,
  },

  {
    id: "ENGLISH_ONLY",
    name: "Only English",
    shortName: "English",
    description: "Focused live English demo class.",
    subjects: ["ENGLISH"],
    durationMinutes: 60,
    active: true,
  },

  {
    id: "ALL_SUBJECTS",
    name: "Math + Science + English",
    shortName: "All Subjects",
    description:
      "Experience our complete learning approach across Math, Science and English.",
    subjects: ["MATH", "SCIENCE", "ENGLISH"],
    durationMinutes: 60,
    active: true,
  },
] as const;

export type DemoProgramId =
  (typeof DEMO_PROGRAMS)[number]["id"];

export type DemoProgram =
  (typeof DEMO_PROGRAMS)[number];