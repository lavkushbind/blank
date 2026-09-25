export const SUBJECTS = [
  {
    id: "MATH",
    name: "Mathematics",
    shortName: "Math",
    active: true,
  },
  {
    id: "ENGLISH",
    name: "English",
    shortName: "English",
    active: true,
  },
  {
    id: "SCIENCE",
    name: "Science",
    shortName: "Science",
    active: true,
  },
] as const;

export type SubjectId = (typeof SUBJECTS)[number]["id"];