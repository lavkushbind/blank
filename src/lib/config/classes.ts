export const CLASSES = [
  {
    id: 1,
    name: "Class 1",
    label: "1",
  },
  {
    id: 2,
    name: "Class 2",
    label: "2",
  },
  {
    id: 3,
    name: "Class 3",
    label: "3",
  },
  {
    id: 4,
    name: "Class 4",
    label: "4",
  },
  {
    id: 5,
    name: "Class 5",
    label: "5",
  },
  {
    id: 6,
    name: "Class 6",
    label: "6",
  },
  {
    id: 7,
    name: "Class 7",
    label: "7",
  },
  {
    id: 8,
    name: "Class 8",
    label: "8",
  },
  {
    id: 9,
    name: "Class 9",
    label: "9",
  },
  {
    id: 10,
    name: "Class 10",
    label: "10",
  },
] as const;

export type ClassNumber = (typeof CLASSES)[number]["id"];