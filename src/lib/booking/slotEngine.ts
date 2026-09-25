import type { Firestore } from "firebase/firestore";
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import type {
  DemoType,
} from "@/types/booking";

import type {
  TimeSlotId,
} from "@/lib/config/timeSlots";

import {
  TIME_SLOTS,
} from "@/lib/config/timeSlots";

// ======================================================
// TYPES
// ======================================================

export interface TeacherSlotReservationInput {
  db: Firestore;

  teacherId: string;

  date: string;

  slotId: TimeSlotId;

  demoType: DemoType;

  bookingId: string;

  batchId: string;
}

export interface TeacherSlotReservationResult {
  reservationId: string;

  teacherId: string;

  date: string;

  slotId: TimeSlotId;

  demoType: DemoType;

  status: "RESERVED";
}

// ======================================================
// GET SLOT
// ======================================================

export function getTimeSlot(
  slotId: TimeSlotId
) {
  return TIME_SLOTS.find(
    (slot) => slot.id === slotId
  );
}

// ======================================================
// SLOT ID
// ======================================================

export function buildTeacherSlotReservationId(
  teacherId: string,
  date: string,
  slotId: TimeSlotId
): string {
  return [
    teacherId,
    date,
    slotId,
  ]
    .join("_")
    .replace(
      /[^a-zA-Z0-9_-]/g,
      ""
    );
}

// ======================================================
// CHECK TEACHER SLOT
// ======================================================

export async function reserveTeacherSlot(
  input: TeacherSlotReservationInput
): Promise<TeacherSlotReservationResult> {
  const {
    db,
    teacherId,
    date,
    slotId,
    demoType,
    bookingId,
    batchId,
  } = input;

  if (!teacherId) {
    throw new Error(
      "Teacher ID is required."
    );
  }

  if (!date) {
    throw new Error(
      "Date is required."
    );
  }

  const slot = getTimeSlot(slotId);

  if (!slot) {
    throw new Error(
      "Invalid time slot."
    );
  }

  const reservationId =
    buildTeacherSlotReservationId(
      teacherId,
      date,
      slotId
    );

  const reservationRef = doc(
    collection(
      db,
      "teacher_slot_reservations"
    ),
    reservationId
  );

  return runTransaction(
    db,
    async (transaction) => {
      const existing =
        await transaction.get(
          reservationRef
        );

      // =================================================
      // ALREADY RESERVED
      // =================================================

      if (existing.exists()) {
        const data =
          existing.data();

        /*
         * If the same booking is retrying,
         * treat it as idempotent.
         */

        if (
          data.bookingId === bookingId
        ) {
          return {
            reservationId,

            teacherId,

            date,

            slotId,

            demoType,

            status: "RESERVED",
          };
        }

        throw new Error(
          "Teacher is already booked for this time slot."
        );
      }

      // =================================================
      // CREATE RESERVATION
      // =================================================

      transaction.set(
        reservationRef,
        {
          id: reservationId,

          teacherId,

          date,

          slotId,

          startTime: slot.startTime,
          endTime: slot.endTime,

          demoType,

          bookingId,

          batchId,

          status: "RESERVED",

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );

      return {
        reservationId,

        teacherId,

        date,

        slotId,

        demoType,

        status: "RESERVED",
      };
    }
  );
}

// ======================================================
// CHECK ONLY
// ======================================================

export async function isTeacherSlotAvailable(
  db: Firestore,
  teacherId: string,
  date: string,
  slotId: TimeSlotId
): Promise<boolean> {
  const reservationId =
    buildTeacherSlotReservationId(
      teacherId,
      date,
      slotId
    );

  const reservationRef = doc(
    db,
    "teacher_slot_reservations",
    reservationId
  );

  /*
   * This function is useful for UI/pre-checks.
   *
   * It MUST NOT be treated as the final
   * booking guarantee.
   *
   * Final protection is reserveTeacherSlot()
   * inside a Firestore transaction.
   */

  const snapshot =
    await import("firebase/firestore")
      .then(({ getDoc }) =>
        getDoc(reservationRef)
      );

  return !snapshot.exists();
}