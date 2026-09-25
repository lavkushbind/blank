import { createHash } from "node:crypto";
import {
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";

import type { BoardId } from "@/lib/config/boards";
import type { ClassNumber } from "@/lib/config/classes";
import type { DemoProgramId } from "@/lib/config/demoPrograms";
import type { TimeSlotId } from "@/lib/config/timeSlots";

export interface AllocateDemoInput {
  studentId: string;
  parentId?: string;
  studentName: string;
  classNumber: ClassNumber;
  board: BoardId;
  programId: DemoProgramId;
  demoType: "GROUP" | "INDIVIDUAL";
  date: string;
  slotId: TimeSlotId;
  startTime: string;
  endTime: string;
  teacherId: string;
  teacherName?: string;
  subjects: string[];
  originalPrice: number;
  discount: number;
  finalPrice: number;
  paymentStatus: "NOT_REQUIRED" | "PENDING";
  email?: string;
  phone?: string;
  existingBatchId?: string;
}

export interface AllocateDemoResult {
  bookingId: string;
  batchId: string;
  sessionId: string;
  teacherId: string;
  enrolledCount: number;
  capacity: number;
  bookingStatus: string;
  paymentStatus: string;
  createdNewBatch: boolean;
}

const GROUP_CAPACITY = 5;
const INDIVIDUAL_CAPACITY = 1;

function stableId(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function dateInIndia(value: unknown): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value.slice(0, 10);
  }
  const date = value instanceof Timestamp
    ? value.toDate()
    : value instanceof Date
      ? value
      : typeof value === "string"
        ? new Date(value)
      : value && typeof (value as { toDate?: unknown }).toDate === "function"
        ? (value as Timestamp).toDate()
        : null;
  return date
    ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date)
    : "";
}

function timeInIndia(value: unknown): string {
  const date = value instanceof Timestamp
    ? value.toDate()
    : value instanceof Date
      ? value
      : typeof value === "string"
        ? new Date(value)
        : value && typeof (value as { toDate?: unknown }).toDate === "function"
          ? (value as Timestamp).toDate()
          : null;
  return date
    ? new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(date)
    : "";
}

function isSameScheduledOccurrence(
  session: FirebaseFirestore.DocumentData,
  date: string,
  slotId: TimeSlotId,
  startTime: string,
) {
  if (dateInIndia(session.date || session.scheduledAt) !== date) return false;
  if (session.slotId) return session.slotId === slotId;
  const scheduledStart = session.startTime || timeInIndia(session.scheduledAt);
  return String(scheduledStart).slice(0, 5) === startTime;
}

function batchMatchesDate(batch: FirebaseFirestore.DocumentData, date: string) {
  if (!batch.date || String(batch.date).slice(0, 10) === date) return true;
  const days = [batch.day, batch.dayOfWeek, ...(Array.isArray(batch.days) ? batch.days : [])]
    .map((day) => String(day || "").trim().toUpperCase())
    .filter(Boolean);
  const requestedDay = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${date}T12:00:00+05:30`)).toUpperCase();
  return days.includes(requestedDay);
}

/**
 * A demo is a trial membership in the regular batch. Its scheduled LiveKit
 * session is created in the same transaction as the booking, so the batch,
 * booking, membership, and classroom cannot be left half-linked.
 */
export async function allocateDemoBooking(
  input: AllocateDemoInput,
): Promise<AllocateDemoResult> {
  const batchId = input.existingBatchId || [
    input.teacherId,
    input.date,
    input.slotId,
    input.classNumber,
    input.board,
    input.programId,
    input.demoType,
  ].join("_");

  const batchRef = adminDb.collection("batches").doc(batchId);
  const lockId = `${input.teacherId}_${input.date}_${input.slotId}`;
  const lockRef = adminDb.collection("teacher_slot_locks").doc(lockId);
  const studentLockId = `${input.studentId}_${input.date}_${input.slotId}`;
  const studentLockRef = adminDb.collection("student_slot_locks").doc(studentLockId);
  const proposedSessionId = `session_${stableId(`${batchId}_${input.date}_${input.slotId}`)}`;
  const proposedSessionRef = adminDb.collection("class_sessions").doc(proposedSessionId);
  const teacherSessionsQuery = adminDb.collection("class_sessions")
    .where("teacherId", "==", input.teacherId);
  const studentSessionsQuery = adminDb.collection("class_sessions")
    .where("studentIds", "array-contains", input.studentId);
  const bookingId = `demo_${stableId(`${input.studentId}_${batchId}_${input.date}_${input.slotId}`)}`;
  const bookingRef = adminDb.collection("demo_bookings").doc(bookingId);
  const enrollmentId = `${batchId}_${input.studentId}`;
  const enrollmentRef = adminDb.collection("enrollments").doc(enrollmentId);

  return adminDb.runTransaction(async (transaction) => {
    const [lockSnap, studentLockSnap, batchSnap, bookingSnap, enrollmentSnap, teacherSessionsSnap, studentSessionsSnap] =
      await Promise.all([
        transaction.get(lockRef),
        transaction.get(studentLockRef),
        transaction.get(batchRef),
        transaction.get(bookingRef),
        transaction.get(enrollmentRef),
        transaction.get(teacherSessionsQuery),
        transaction.get(studentSessionsQuery),
      ]);

    if (bookingSnap.exists) {
      const existing = bookingSnap.data()!;
      const batch = batchSnap.data();
      return {
        bookingId,
        batchId,
        sessionId: existing.sessionId || proposedSessionId,
        teacherId: input.teacherId,
        enrolledCount: Number(batch?.enrolledCount ?? 1),
        capacity: Number(batch?.capacity ?? (input.demoType === "GROUP" ? GROUP_CAPACITY : INDIVIDUAL_CAPACITY)),
        bookingStatus: String(existing.status || "CONFIRMED"),
        paymentStatus: String(existing.paymentStatus || input.paymentStatus),
        createdNewBatch: false,
      };
    }

    const capacity = input.demoType === "GROUP" ? GROUP_CAPACITY : INDIVIDUAL_CAPACITY;
    const batch = batchSnap.data() || {};
    const matchingSession = teacherSessionsSnap.docs.find((sessionDoc) => {
      const existing = sessionDoc.data();
      return existing.batchId === batchId &&
        isSameScheduledOccurrence(existing, input.date, input.slotId, input.startTime);
    });
    const conflictingSession = teacherSessionsSnap.docs.find((sessionDoc) => {
      const existing = sessionDoc.data();
      const terminal = ["ENDED", "COMPLETED", "CANCELLED"].includes(String(existing.status || "").toUpperCase());
      return sessionDoc.id !== matchingSession?.id &&
        !terminal &&
        isSameScheduledOccurrence(existing, input.date, input.slotId, input.startTime);
    });

    if (conflictingSession) throw new Error("TEACHER_SLOT_BUSY");

    const studentSessionConflict = studentSessionsSnap.docs.some((sessionDoc) => {
      const existing = sessionDoc.data();
      const terminal = ["ENDED", "COMPLETED", "CANCELLED"].includes(String(existing.status || "").toUpperCase());
      return !terminal &&
        existing.batchId !== batchId &&
        isSameScheduledOccurrence(existing, input.date, input.slotId, input.startTime);
    });
    if (
      studentSessionConflict ||
      (studentLockSnap.exists &&
        studentLockSnap.data()?.active === true &&
        studentLockSnap.data()?.batchId !== batchId)
    ) {
      throw new Error("STUDENT_SLOT_BUSY");
    }

    const sessionId = matchingSession?.id || proposedSessionId;
    const sessionRef = matchingSession?.ref || proposedSessionRef;
    const sessionSnap = matchingSession
      ? await transaction.get(sessionRef)
      : null;

    if (batchSnap.exists) {
      const currentTeacherId = String(batch.teacherId || batch.teacherUid || "");
      const currentClassNumber = Number(batch.classNumber ?? String(batch.grade || "").match(/\d+/)?.[0]);
      const currentStudentIds = Array.isArray(batch.studentIds) ? batch.studentIds : [];
      const currentCount = Number(batch.enrolledCount ?? currentStudentIds.length);
      const batchSubjects = Array.isArray(batch.subjects)
        ? batch.subjects.map(String)
        : [String(batch.subject || "")];
      const normalizeSubject = (value: string) => {
        const subject = value.trim().toUpperCase();
        if (["MATH", "MATHEMATICS", "MATHS"].includes(subject)) return "MATH";
        if (subject === "SCIENCE") return "SCIENCE";
        if (subject === "ENGLISH") return "ENGLISH";
        return subject;
      };

      if (
        (currentTeacherId && currentTeacherId !== input.teacherId) ||
        (Number.isFinite(currentClassNumber) && currentClassNumber !== input.classNumber) ||
        (batch.board && batch.board !== input.board) ||
        (batch.programId && batch.programId !== input.programId) ||
        (batch.demoType && batch.demoType !== input.demoType) ||
        !batchMatchesDate(batch, input.date) ||
        (batch.slotId && batch.slotId !== input.slotId) ||
        batch.isActive === false ||
        batch.status === "CANCELLED" ||
        batch.status === "INACTIVE" ||
        currentCount >= Math.min(Number(batch.capacity ?? capacity), capacity) ||
        enrollmentSnap.exists
      ) {
        throw new Error(enrollmentSnap.exists ? "STUDENT_ALREADY_IN_BATCH" : "BATCH_FULL");
      }

      // Generic legacy batch records are only reusable when their available
      // fields positively match the selected program and grade.
      if (
        batch.programId && batch.programId !== input.programId
      ) {
        throw new Error("BATCH_INCOMPATIBLE");
      }
      if (
        !batch.programId &&
        input.subjects.some((subject) => !batchSubjects.some((existing: string) => normalizeSubject(existing) === normalizeSubject(subject)))
      ) {
        throw new Error("BATCH_INCOMPATIBLE");
      }

      if (
        lockSnap.exists &&
        lockSnap.data()?.active === true &&
        lockSnap.data()?.batchId !== batchId
      ) {
        throw new Error("TEACHER_SLOT_BUSY");
      }
    } else if (
      lockSnap.exists &&
      lockSnap.data()?.active === true &&
      lockSnap.data()?.batchId !== batchId
    ) {
      throw new Error("TEACHER_SLOT_BUSY");
    }

    const currentStudentIds = Array.isArray(batch.studentIds)
      ? batch.studentIds.filter((id: unknown): id is string => typeof id === "string")
      : [];
    const currentCount = Number(batch.enrolledCount ?? currentStudentIds.length);
    const studentIds = currentStudentIds.includes(input.studentId)
      ? currentStudentIds
      : [...currentStudentIds, input.studentId];
    const enrolledCount = currentCount + (currentStudentIds.includes(input.studentId) ? 0 : 1);
    const bookingStatus = input.finalPrice === 0 ? "CONFIRMED" : "PAYMENT_PENDING";
    const confirmedTrial = input.paymentStatus === "NOT_REQUIRED";
    const scheduledAt = Timestamp.fromDate(
      new Date(`${input.date}T${input.startTime}:00+05:30`),
    );
    const existingSession = sessionSnap?.data() || {};
    const confirmedStudentIds = Array.isArray(existingSession.studentIds)
      ? existingSession.studentIds.filter((id: unknown): id is string => typeof id === "string")
      : currentStudentIds;
    const sessionStudentIds = confirmedTrial && !confirmedStudentIds.includes(input.studentId)
      ? [...confirmedStudentIds, input.studentId]
      : confirmedStudentIds;

    transaction.set(batchRef, {
      id: batchId,
      name: batch.name || `Class ${input.classNumber} · ${input.subjects.join(" + ")}`,
      grade: batch.grade || `Class ${input.classNumber}`,
      classNumber: input.classNumber,
      board: input.board,
      programId: input.programId,
      demoType: input.demoType,
      subject: input.subjects.join(" + "),
      subjects: input.subjects,
      teacherId: input.teacherId,
      teacherName: input.teacherName || batch.teacherName || null,
      ...(batchSnap.exists ? {} : {
        date: input.date,
        slotId: input.slotId,
        startTime: input.startTime,
        endTime: input.endTime,
        timeSlot: `${input.startTime}–${input.endTime}`,
      }),
      capacity,
      enrolledCount,
      studentIds,
      isActive: true,
      status: batchSnap.exists
        ? (batch.status || (enrolledCount >= capacity ? "FULL" : "OPEN"))
        : (enrolledCount >= capacity ? "FULL" : "OPEN"),
      updatedAt: FieldValue.serverTimestamp(),
      ...(batchSnap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    }, { merge: true });

    transaction.set(lockRef, {
      teacherId: input.teacherId,
      date: input.date,
      slotId: input.slotId,
      batchId,
      active: true,
      updatedAt: FieldValue.serverTimestamp(),
      ...(lockSnap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    }, { merge: true });

    transaction.set(studentLockRef, {
      studentId: input.studentId,
      date: input.date,
      slotId: input.slotId,
      batchId,
      active: true,
      updatedAt: FieldValue.serverTimestamp(),
      ...(studentLockSnap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    }, { merge: true });

    transaction.set(sessionRef, {
      id: sessionId,
      type: "DEMO",
      batchId,
      teacherId: input.teacherId,
      studentIds: sessionStudentIds,
      title: existingSession.title || `Class ${input.classNumber} · ${input.subjects.join(" + ")}`,
      subject: existingSession.subject || input.subjects.join(" + "),
      className: `Class ${input.classNumber}`,
      classNumber: input.classNumber,
      board: input.board,
      programId: input.programId,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      status: existingSession.status || "SCHEDULED",
      scheduledAt: existingSession.scheduledAt || scheduledAt,
      durationMinutes: 60,
      liveRoomId: existingSession.liveRoomId || `blanklearn_${sessionId}`,
      livekitRoomName: existingSession.livekitRoomName || `blanklearn_${sessionId}`,
      updatedAt: FieldValue.serverTimestamp(),
      ...((sessionSnap?.exists) ? {} : { createdAt: FieldValue.serverTimestamp() }),
    }, { merge: true });

    transaction.set(bookingRef, {
      id: bookingId,
      studentId: input.studentId,
      parentId: input.parentId ?? null,
      studentName: input.studentName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      teacherId: input.teacherId,
      batchId,
      sessionId,
      classNumber: input.classNumber,
      board: input.board,
      programId: input.programId,
      subjects: input.subjects,
      demoType: input.demoType,
      date: input.date,
      slotId: input.slotId,
      startTime: input.startTime,
      endTime: input.endTime,
      originalPrice: input.originalPrice,
      discount: input.discount,
      finalPrice: input.finalPrice,
      status: bookingStatus,
      paymentStatus: input.paymentStatus,
      membershipStatus: confirmedTrial ? "TRIAL" : "PENDING_PAYMENT",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (confirmedTrial) {
      transaction.set(enrollmentRef, {
        batchId,
        studentId: input.studentId,
        userId: input.studentId,
        teacherId: input.teacherId,
        sessionId,
        bookingId,
        status: "TRIAL",
        membershipStatus: "TRIAL",
        paymentStatus: "NOT_REQUIRED",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    return {
      bookingId,
      batchId,
      sessionId,
      teacherId: input.teacherId,
      enrolledCount,
      capacity,
      bookingStatus,
      paymentStatus: input.paymentStatus,
      createdNewBatch: !batchSnap.exists,
    };
  });
}

/** Confirm a verified demo payment and grant the student trial access. */
export async function confirmDemoBookingPayment({
  bookingId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}: {
  bookingId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
}) {
  const bookingRef = adminDb.collection("demo_bookings").doc(bookingId);

  return adminDb.runTransaction(async (transaction) => {
    const bookingSnap = await transaction.get(bookingRef);
    if (!bookingSnap.exists) throw new Error("BOOKING_NOT_FOUND");
    const booking = bookingSnap.data()!;
    if (booking.razorpayOrderId !== razorpayOrderId) throw new Error("PAYMENT_ORDER_MISMATCH");

    const paymentRef = adminDb.collection("payments").doc(razorpayOrderId);
    const batchId = String(booking.batchId || "");
    const studentId = String(booking.studentId || "");
    const sessionId = String(booking.sessionId || "");
    if (!batchId || !studentId || !sessionId) throw new Error("BOOKING_SESSION_LINK_MISSING");

    const enrollmentRef = adminDb.collection("enrollments").doc(`${batchId}_${studentId}`);
    const sessionIds = Array.isArray(booking.sessionIds) ? booking.sessionIds.filter((id: unknown): id is string => typeof id === "string") : [sessionId];
    const sessionRefs = sessionIds.map((id: string) => adminDb.collection("class_sessions").doc(id));
    const [paymentSnap, enrollmentSnap, sessionSnaps] = await Promise.all([
      transaction.get(paymentRef),
      transaction.get(enrollmentRef),
      Promise.all(sessionRefs.map((ref: FirebaseFirestore.DocumentReference) => transaction.get(ref))),
    ]);
    if (sessionSnaps.some((snapshot: FirebaseFirestore.DocumentSnapshot) => !snapshot.exists)) throw new Error("CLASS_SESSION_NOT_FOUND");

    if (booking.paymentStatus === "PAID" && enrollmentSnap.exists) return { alreadyPaid: true };

    transaction.update(bookingRef, {
      paymentStatus: "PAID",
      status: "CONFIRMED",
      membershipStatus: "TRIAL",
      razorpayPaymentId,
      ...(razorpaySignature ? { razorpaySignature } : {}),
      paidAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(paymentRef, {
      bookingId,
      razorpayOrderId,
      razorpayPaymentId,
      status: "PAID",
      amount: booking.finalPrice,
      currency: booking.currency || "INR",
      verifiedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(enrollmentRef, {
      batchId,
      studentId,
      userId: studentId,
      teacherId: booking.teacherId,
      sessionId,
      sessionIds,
      bookingId,
      status: "TRIAL",
      membershipStatus: "TRIAL",
      paymentStatus: "PAID",
      createdAt: enrollmentSnap.exists
        ? enrollmentSnap.data()?.createdAt || FieldValue.serverTimestamp()
        : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    sessionSnaps.forEach((sessionSnapshot: FirebaseFirestore.DocumentSnapshot, index: number) => {
      const ids = Array.isArray(sessionSnapshot.data()?.studentIds) ? sessionSnapshot.data()!.studentIds.filter((id: unknown): id is string => typeof id === "string") : [];
      transaction.update(sessionRefs[index], {
        studentIds: ids.includes(studentId) ? ids : [...ids, studentId],
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return { alreadyPaid: false };
  });
}

/** Upgrade an existing trial membership after a captured course payment. */
export async function activateTrialMembershipPurchase({
  bookingId,
  razorpayOrderId,
  razorpayPaymentId,
}: {
  bookingId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
}) {
  const bookingRef = adminDb.collection("demo_bookings").doc(bookingId);
  const paymentRef = adminDb.collection("payments").doc(razorpayOrderId);

  return adminDb.runTransaction(async (transaction) => {
    const [bookingSnap, paymentSnap] = await Promise.all([
      transaction.get(bookingRef),
      transaction.get(paymentRef),
    ]);
    if (!bookingSnap.exists || !paymentSnap.exists) throw new Error("PURCHASE_RECORD_NOT_FOUND");
    const booking = bookingSnap.data()!;
    const payment = paymentSnap.data()!;
    if (payment.type !== "COURSE_PURCHASE" || payment.bookingId !== bookingId || payment.studentId !== booking.studentId) {
      throw new Error("PURCHASE_ORDER_MISMATCH");
    }
    if (payment.status === "PAID" && booking.membershipStatus === "ACTIVE") return { alreadyActive: true };

    const batchId = String(booking.batchId || "");
    const studentId = String(booking.studentId || "");
    if (!batchId || !studentId || !booking.sessionId) throw new Error("BOOKING_SESSION_LINK_MISSING");
    const enrollmentRef = adminDb.collection("enrollments").doc(`${batchId}_${studentId}`);
    const enrollmentSnap = await transaction.get(enrollmentRef);
    if (!enrollmentSnap.exists || !["TRIAL", "ACTIVE"].includes(String(enrollmentSnap.data()?.membershipStatus || enrollmentSnap.data()?.status || "").toUpperCase())) {
      throw new Error("TRIAL_ENROLLMENT_NOT_ACTIVE");
    }

    const planType = String(payment.planType || "");
    const planMatch = /^M([136])_D([36])$/.exec(planType);
    const durationMonths = planMatch ? Number(planMatch[1]) : planType === "QUARTERLY" ? 3 : planType === "MONTHLY" ? 1 : 0;
    const classesPerWeek = planMatch ? Number(planMatch[2]) : null;
    if (!durationMonths) throw new Error("INVALID_PURCHASE_PLAN");
    const durationDays = durationMonths * 30;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    transaction.set(paymentRef, {
      status: "PAID",
      razorpayOrderId,
      razorpayPaymentId,
      verifiedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(enrollmentRef, {
      status: "ACTIVE",
      membershipStatus: "ACTIVE",
      paymentStatus: "PAID",
      planType,
      planMonths: durationMonths,
      ...(classesPerWeek ? { classesPerWeek } : {}),
      activatedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(bookingRef, {
      membershipStatus: "ACTIVE",
      subscriptionPlan: planType,
      subscriptionDurationMonths: durationMonths,
      ...(classesPerWeek ? { classesPerWeek } : {}),
      subscriptionExpiresAt: Timestamp.fromDate(expiresAt),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { alreadyActive: false, planType, expiresAt };
  });
}
