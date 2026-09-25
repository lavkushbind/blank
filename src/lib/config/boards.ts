export const BOARDS = [
  {
    id: "CBSE",
    name: "CBSE",
    shortName: "CBSE",
    active: true,
  },
  {
    id: "ICSE",
    name: "ICSE",
    shortName: "ICSE",
    active: true,
  },
  {
    id: "STATE",
    name: "State Board",
    shortName: "State",
    active: true,
  },
  {
    id: "OTHER",
    name: "Other Board",
    shortName: "Other",
    active: true,
  },
] as const;

export type BoardId = (typeof BOARDS)[number]["id"];