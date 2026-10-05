import { FieldValue } from "firebase-admin/firestore";
import { demoPrice } from "@/lib/platform/demo-price";
import { settings } from "@/lib/platform/server";
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebase/admin";

import {
  BOOKING_CONFIG,
} from "@/lib/config/booking";

import {
  DEMO_PROGRAMS,
} from "@/lib/config/demoPrograms";

import {
  TIME_SLOTS,
} from "@/lib/config/timeSlots";

import {
  findMatchingTeachers,
  normalizeExistingBatchForRequest,
  type TeacherRecord,
  type ExistingBatch,
} from "@/lib/booking/teacherMatcher";

import {
  allocateDemoBooking,
} from "@/lib/booking/batchAllocator";

import type {
  BoardId,
} from "@/lib/config/boards";

import type {
  DemoProgramId,
} from "@/lib/config/demoPrograms";

import type {
  TimeSlotId,
} from "@/lib/config/timeSlots";

type Body = {
  existingBatchId?: string;
  studentName: string;

  classNumber: number;

  board: BoardId;

  programId: DemoProgramId;

  demoType:
    | "GROUP"
    | "INDIVIDUAL";

  date: string;

  slotId: TimeSlotId;

  phone?: string;

  email?: string;

  couponCode?: string;
};

/* ========================================================================== */
/* AUTH                                                                       */
/* ========================================================================== */

async function getAuthenticatedUser(
  request: NextRequest,
) {
  const authHeader =
    request.headers.get(
      "authorization",
    );

  let token =
    authHeader?.startsWith(
      "Bearer ",
    )
      ? authHeader.slice(7)
      : null;

  /*
   * Cookie fallback.
   */
  if (!token) {
    token =
      request.cookies.get(
        "__session",
      )?.value ?? null;
  }

  if (!token) {
    throw new Error(
      "AUTH_REQUIRED",
    );
  }

  return adminAuth.verifyIdToken(
    token,
  );
}

/* ========================================================================== */
/* VALIDATION                                                                 */
/* ========================================================================== */

function isValidDate(
  value: string,
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value,
  );
}

function addCalendarDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizePhone(
  value?: string,
) {
  return (
    value ?? ""
  ).replace(/\D/g, "");
}

/* ========================================================================== */
/* POST                                                                       */
/* ========================================================================== */

export async function POST(
  request: NextRequest,
) {
  try {
    /*
     * 1. AUTHENTICATION
     */
    const user =
      await getAuthenticatedUser(
        request,
      );

    /*
     * 2. BODY
     */
    const body =
      (await request.json()) as Body;
    const platform = await settings();
    const quote = demoPrice(platform);
    const freeDemoOfferActive = !quote.paymentRequired;

    const studentName =
      String(
        body.studentName ?? "",
      ).trim();

    const classNumber =
      Number(
        body.classNumber,
      );

    const board =
      body.board;

    const programId =
      body.programId;

    const demoType =
      body.demoType;

    const date =
      body.date;

    const slotId =
      body.slotId;

    const phone =
      normalizePhone(
        body.phone,
      );

    /*
     * 3. BASIC VALIDATION
     */

    if (
      studentName.length <
      2
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Student name is required.",
        },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(classNumber) ||
      classNumber < 1 ||
      classNumber > 10
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Class must be between 1 and 10.",
        },
        { status: 400 },
      );
    }

    if (
      !isValidDate(date)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid booking date.",
        },
        { status: 400 },
      );
    }

    if (
      ![
        "GROUP",
        "INDIVIDUAL",
      ].includes(
        demoType,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid demo type.",
        },
        { status: 400 },
      );
    }

    const program =
      DEMO_PROGRAMS.find(
        item =>
          item.id ===
          programId,
      );

    if (!program) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid demo program.",
        },
        { status: 400 },
      );
    }

    const slot =
      TIME_SLOTS.find(
        item =>
          item.id ===
          slotId,
      );

    if (!slot) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid time slot.",
        },
        { status: 400 },
      );
    }

    /*
     * 4. STUDENT PROFILE
     *
     * Never trust studentId from client.
     * Always use Firebase UID.
     */

    const studentRef =
      adminDb
        .collection(
          "students",
        )
        .doc(user.uid);

    const studentSnap =
      await studentRef.get();

    const existingStudent =
      studentSnap.exists
        ? studentSnap.data()
        : {};

    if (["REGULAR", "DEMO_ALLOCATED", "DEMO_ACTIVE"].includes(existingStudent?.enrollmentStatus || "")) return NextResponse.json({ success: false, message: "You already have an allocated demo or regular batch." }, { status: 409 });

    /*
     * 5. ENSURE ROLE
     */

    const userRef =
      adminDb
        .collection("users")
        .doc(user.uid);

    const userSnap =
      await userRef.get();

    if (userSnap.exists) {
      const userData =
        userSnap.data();

      if (
        userData?.role &&
        userData.role !==
          "STUDENT"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This account cannot book a student demo.",
          },
          { status: 403 },
        );
      }
    }

    /*
     * 6. UPSERT STUDENT
     *
     * Backend also makes sure the student
     * profile exists.
     */

    await userRef.set(
      {
        uid: user.uid,

        name:
          studentName ||
          existingStudent?.name ||
          user.name ||
          "Student",

        email:
          user.email ??
          existingStudent?.email ??
          null,

        phone:
          phone ||
          existingStudent?.phone ||
          null,

        role: "STUDENT",

        updatedAt:
          new Date(),
      },
      {
        merge: true,
      },
    );

    await studentRef.set(
      {
        uid: user.uid,

        name:
          studentName ||
          existingStudent?.name ||
          user.name ||
          "Student",

        email:
          user.email ??
          existingStudent?.email ??
          null,

        phone:
          phone ||
          existingStudent?.phone ||
          null,

        classNumber,

        board,

        updatedAt:
          new Date(),
      },
      {
        merge: true,
      },
    );

    /*
     * 7. LOAD TEACHERS
     */

    const teacherSnapshot =
      await adminDb
        .collection(
          "teachers",
        )
        .get();

    const teachers: TeacherRecord[] =
      teacherSnapshot.docs.map(
        doc => ({
          id: doc.id,
          ...(doc.data() as any),
        }),
      );

    /*
     * 8. LOAD EXISTING BATCHES
     *
     * We can restrict this later with
     * Firestore queries. For correctness
     * this reads demo batches and matcher
     * filters them.
     */

    const batchSnapshot =
      await adminDb
        .collection("batches")
        .get();

    const matchRequest = {
      classNumber,
      board,
      programId,
      demoType,
      date,
      slotId,
    };

    const existingBatches: ExistingBatch[] = batchSnapshot.docs
      .map((batchDoc) => normalizeExistingBatchForRequest(
        batchDoc.id,
        batchDoc.data(),
        matchRequest,
      ))
      .filter((batch): batch is ExistingBatch => batch !== null);

    /*
     * 9. MATCH
     */

    const demoDates = [date, addCalendarDays(date, 1), addCalendarDays(date, 2)];
    const matches =
      findMatchingTeachers(
        {
          classNumber,
          board,
          programId,
          demoType,
          date,
          slotId,
        },
        teachers,
        existingBatches,
      );
    const consecutiveAvailability = new Set(matches.map((match) => match.teacher.id));
    for (const followupDate of demoDates.slice(1)) {
      const availableTeachers = new Set(findMatchingTeachers(
        { classNumber, board, programId, demoType, date: followupDate, slotId },
        teachers,
        [],
      ).map((match) => match.teacher.id));
      for (const teacherId of consecutiveAvailability) {
        if (!availableTeachers.has(teacherId)) consecutiveAvailability.delete(teacherId);
      }
    }
    const eligibleMatches = matches.filter((match) => consecutiveAvailability.has(match.teacher.id) && (!body.existingBatchId || match.existingBatch?.id === body.existingBatchId));

    if (eligibleMatches.length === 0) {
      if (body.existingBatchId) return NextResponse.json({ success: false, message: "This batch is no longer available. Choose another slot." }, { status: 409 });
      const bookingId = "waiting_" + user.uid;
      await adminDb.runTransaction(async transaction => {
        const current = await transaction.get(studentRef);
        if (["REGULAR", "DEMO_ALLOCATED", "DEMO_ACTIVE"].includes(current.data()?.enrollmentStatus)) throw new Error("STUDENT_ALREADY_ENROLLED");
        transaction.set(adminDb.collection("demo_bookings").doc(bookingId), { studentId: user.uid, studentName, grade: "Class " + classNumber, classNumber, board, programId, subjects: [...program.subjects], demoType, date, slotId, startTime: slot.startTime, endTime: slot.endTime, batchId: null, teacherId: null, status: "BOOKED", allocationStatus: "PENDING", paymentStatus: "PENDING_ALLOCATION", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        transaction.set(studentRef, { enrollmentStatus: "DEMO_BOOKED", demoStatus: "BOOKED", grade: "Class " + classNumber, selectedPlan: programId === "ALL_SUBJECTS" ? "COMBO" : programId === "MATH_ONLY" ? "MATH" : "ENGLISH", selectedSubjects: [...program.subjects], demoBookingId: bookingId, demoBatchId: null, activeBatchId: null, subscriptionStatus: "NONE", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      });
      return NextResponse.json({ success: true, pendingAllocation: true, message: "Demo booked. We're finding a compatible batch for your preferred slot." }, { status: 202 });
    }

    /*
     * 10. TRY MATCHES
     *
     * Important:
     *
     * If first teacher becomes busy
     * between matching and transaction,
     * try next eligible teacher.
     */

    let lastError:
      | string
      | null = null;

      for (
      const match of eligibleMatches
    ) {
      try {
        const result =
          await allocateDemoBooking(
            {
              demoDates,
              studentId:
                user.uid,

              studentName,

              classNumber:
                classNumber as any,

              board,

              programId,

              demoType,

              date,

              slotId,

              startTime:
                slot.startTime,

              endTime:
                slot.endTime,

              teacherId:
                match.teacher.id,

              teacherName:
                match.teacher.name,

              existingBatchId:
                match.existingBatch?.id,

              subjects: [...program.subjects],

              originalPrice:
                platform.demoFee,

              discount:
                freeDemoOfferActive
                  ? platform.demoFee
                  : 0,

              finalPrice:
                freeDemoOfferActive
                  ? 0
                  : platform.demoFee,

              paymentStatus:
                freeDemoOfferActive
                  ? "NOT_REQUIRED"
                  : "PENDING",

              email:
                user.email ??
                undefined,

              phone:
                phone ||
                undefined,
            },
          );

        const sessionIds = (await adminDb.collection("demo_bookings").doc(result.bookingId).get()).data()?.sessionIds || [result.sessionId];

        /*
         * 11. SUCCESS
         */

        return NextResponse.json(
          {
            success: true,

            booking: {
              id:
                result.bookingId,

              batchId:
                result.batchId,

              sessionId:
                result.sessionId,

              sessionIds,

              demoSessionCount: 3,

              sessionDates: demoDates,

              teacherId:
                result.teacherId,

              studentId:
                user.uid,

              classNumber,

              board,

              programId,

              subjects:
                program.subjects,

              demoType,

              date,

              slotId,

              startTime:
                slot.startTime,

              endTime:
                slot.endTime,

              status:
                result.bookingStatus,

              paymentStatus:
                result.paymentStatus,
            },

            pricing: {
              currency:
                "INR",

              originalPrice:
                platform.demoFee,

              discount:
                freeDemoOfferActive
                  ? platform.demoFee
                  : 0,

              finalPrice:
                freeDemoOfferActive
                  ? 0
                  : platform.demoFee,

              paymentRequired:
                !(
                  freeDemoOfferActive
                ),
            },

            teacher: {
              id:
                match.teacher.id,

              name:
                match.teacher.name,
            },

            batch: {
              id:
                result.batchId,

              sessionId:
                result.sessionId,

              enrolledCount:
                result.enrolledCount,

              capacity:
                result.capacity,

              createdNewBatch:
                result.createdNewBatch,
            },

            message:
              "Demo allocated successfully.",
          },
        );
      } catch (error: any) {
        lastError =
          error?.message ??
          "Allocation failed.";

        if (lastError === "STUDENT_SLOT_BUSY" || lastError === "STUDENT_ALREADY_IN_BATCH") {
          return NextResponse.json(
            {
              success: false,
              code: lastError,
              message: lastError === "STUDENT_SLOT_BUSY"
                ? "You already have a class booked for this time. Please choose another slot."
                : "You are already a member of this batch.",
            },
            { status: 409 },
          );
        }

        /*
         * Race condition:
         * teacher became busy.
         *
         * Try next teacher.
         */
        if (
          lastError ===
            "TEACHER_SLOT_BUSY" ||
          lastError ===
            "BATCH_FULL" ||
          lastError ===
            "BATCH_INCOMPATIBLE"
        ) {
          continue;
        }

        throw error;
      }
    }

    return NextResponse.json(
      {
        success: false,

        code:
          "ALLOCATION_RACE",

        message:
          "The selected mentor became unavailable. Please select another available slot.",

        lastError,
      },
      { status: 409 },
    );
  } catch (error: any) {
    console.error(
      "[DEMO_BOOKING]",
      error,
    );

    if (
      error?.message ===
      "AUTH_REQUIRED"
    ) {
      return NextResponse.json(
        {
          success: false,
          code:
            "AUTH_REQUIRED",
          message:
            "Please create or sign in to your student account before booking.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Unable to process demo booking.",
      },
      { status: 500 },
    );
  }
}
