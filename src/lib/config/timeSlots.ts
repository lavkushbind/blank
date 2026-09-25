export const TIME_SLOTS = [
  {
    id: "15_16",
    label: "3:00 PM – 4:00 PM",
    startTime: "15:00",
    endTime: "16:00",
    startHour: 15,
    endHour: 16,
  },

  {
    id: "16_17",
    label: "4:00 PM – 5:00 PM",
    startTime: "16:00",
    endTime: "17:00",
    startHour: 16,
    endHour: 17,
  },

  {
    id: "17_18",
    label: "5:00 PM – 6:00 PM",
    startTime: "17:00",
    endTime: "18:00",
    startHour: 17,
    endHour: 18,
  },

  {
    id: "18_19",
    label: "6:00 PM – 7:00 PM",
    startTime: "18:00",
    endTime: "19:00",
    startHour: 18,
    endHour: 19,
  },

  {
    id: "19_20",
    label: "7:00 PM – 8:00 PM",
    startTime: "19:00",
    endTime: "20:00",
    startHour: 19,
    endHour: 20,
  },

  {
    id: "20_21",
    label: "8:00 PM – 9:00 PM",
    startTime: "20:00",
    endTime: "21:00",
    startHour: 20,
    endHour: 21,
  },
] as const;

export type TimeSlotId =
  (typeof TIME_SLOTS)[number]["id"];

export const WEEK_DAYS = [
  {
    id: "MONDAY",
    name: "Monday",
    shortName: "Mon",
  },
  {
    id: "TUESDAY",
    name: "Tuesday",
    shortName: "Tue",
  },
  {
    id: "WEDNESDAY",
    name: "Wednesday",
    shortName: "Wed",
  },
  {
    id: "THURSDAY",
    name: "Thursday",
    shortName: "Thu",
  },
  {
    id: "FRIDAY",
    name: "Friday",
    shortName: "Fri",
  },
  {
    id: "SATURDAY",
    name: "Saturday",
    shortName: "Sat",
  },
  {
    id: "SUNDAY",
    name: "Sunday",
    shortName: "Sun",
  },
] as const;

export type WeekDayId =
  (typeof WEEK_DAYS)[number]["id"];