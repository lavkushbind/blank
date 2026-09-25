import { BOARDS, type BoardId } from "@/lib/config/boards";
import { CLASSES, type ClassNumber } from "@/lib/config/classes";
import {
  DEMO_PROGRAMS,
  type DemoProgramId,
} from "@/lib/config/demoPrograms";
import {
  TIME_SLOTS,
  WEEK_DAYS,
  type TimeSlotId,
} from "@/lib/config/timeSlots";
import type { DemoBookingRequest, DemoType } from "@/types/booking";

export interface EligibilityResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const VALID_DEMO_TYPES: DemoType[] = [
  "GROUP",
  "INDIVIDUAL",
];

export function validateDemoBookingRequest(
  request: DemoBookingRequest
): EligibilityResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // --------------------------------------------------
  // STUDENT
  // --------------------------------------------------

  if (!request.studentName?.trim()) {
    errors.push("Student name is required.");
  }

  // --------------------------------------------------
  // CLASS
  // --------------------------------------------------

  if (!isValidClass(request.classNumber)) {
    errors.push("Invalid class selected.");
  }

  // --------------------------------------------------
  // BOARD
  // --------------------------------------------------

  if (!isValidBoard(request.board)) {
    errors.push("Invalid board selected.");
  }

  // --------------------------------------------------
  // PROGRAM
  // --------------------------------------------------

  const program = DEMO_PROGRAMS.find(
    (item) => item.id === request.programId
  );

  if (!program || !program.active) {
    errors.push("Invalid demo program selected.");
  }

  // --------------------------------------------------
  // DEMO TYPE
  // --------------------------------------------------

  if (!VALID_DEMO_TYPES.includes(request.demoType)) {
    errors.push("Invalid demo type selected.");
  }

  // --------------------------------------------------
  // DATE
  // --------------------------------------------------

  if (!isValidDate(request.date)) {
    errors.push("Invalid demo date.");
  } else if (isPastDate(request.date)) {
    errors.push("Demo date cannot be in the past.");
  }

  // --------------------------------------------------
  // SLOT
  // --------------------------------------------------

  const slot = TIME_SLOTS.find(
    (item) => item.id === request.slotId
  );

  if (!slot) {
    errors.push("Invalid time slot selected.");
  }

  // --------------------------------------------------
  // DATE + SLOT CONSISTENCY
  // --------------------------------------------------

  if (isValidDate(request.date) && slot) {
    const day = getWeekDay(request.date);

    const supportedDay = WEEK_DAYS.some(
      (item) => item.id === day
    );

    if (!supportedDay) {
      errors.push("Invalid booking day.");
    }
  }

  // --------------------------------------------------
  // EMAIL
  // --------------------------------------------------

  if (request.email && !isValidEmail(request.email)) {
    errors.push("Invalid email address.");
  }

  // --------------------------------------------------
  // PHONE
  // --------------------------------------------------

  if (request.phone && !isValidPhone(request.phone)) {
    errors.push("Invalid phone number.");
  }

  // --------------------------------------------------
  // PROGRAM WARNING
  // --------------------------------------------------

  if (program) {
    if (program.subjects.length > 1) {
      warnings.push(
        "This demo includes multiple subjects."
      );
    }
  }

  // --------------------------------------------------
  // FINAL RESULT
  // --------------------------------------------------

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ======================================================
// CLASS
// ======================================================

export function isValidClass(
  value: unknown
): value is ClassNumber {
  return CLASSES.some(
    (item) => item.id === value
  );
}

// ======================================================
// BOARD
// ======================================================

export function isValidBoard(
  value: unknown
): value is BoardId {
  return BOARDS.some(
    (item) => item.id === value && item.active
  );
}

// ======================================================
// PROGRAM
// ======================================================

export function isValidDemoProgram(
  value: unknown
): value is DemoProgramId {
  return DEMO_PROGRAMS.some(
    (item) => item.id === value && item.active
  );
}

// ======================================================
// DEMO TYPE
// ======================================================

export function isValidDemoType(
  value: unknown
): value is DemoType {
  return (
    value === "GROUP" ||
    value === "INDIVIDUAL"
  );
}

// ======================================================
// DATE
// ======================================================

export function isValidDate(
  value: unknown
): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);

  return !Number.isNaN(date.getTime());
}

export function isPastDate(dateString: string): boolean {
  const selectedDate = new Date(
    `${dateString}T00:00:00`
  );

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return selectedDate < today;
}

// ======================================================
// WEEKDAY
// ======================================================

export function getWeekDay(
  dateString: string
) {
  const date = new Date(
    `${dateString}T00:00:00`
  );

  const day = date.getDay();

  const days = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ] as const;

  return days[day];
}

// ======================================================
// SLOT
// ======================================================

export function isValidSlot(
  value: unknown
): value is TimeSlotId {
  return TIME_SLOTS.some(
    (slot) => slot.id === value
  );
}

// ======================================================
// EMAIL
// ======================================================

export function isValidEmail(
  email: string
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email.trim()
  );
}

// ======================================================
// PHONE
// ======================================================

export function isValidPhone(
  phone: string
): boolean {
  const cleaned = phone.replace(/\D/g, "");

  return (
    cleaned.length >= 10 &&
    cleaned.length <= 15
  );
}