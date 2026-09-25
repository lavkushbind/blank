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
    const eligibleMatches = matches.filter((match) => consecutiveAvailability.has(match.teacher.id));

    if (eligibleMatches.length === 0) {
      /*
       * Don't just say "No teacher".
       *
       * Client can call /availability
       * to get suggestions.
       */

      return NextResponse.json(
        {
          success: false,

          code:
            "NO_EXACT_MATCH",

          message:
            "No mentor is available for this exact date and time. Please choose another available slot.",

          suggestionRequired:
            true,
        },
        { status: 409 },
      );
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

        const sessionIds = [result.sessionId, ...demoDates.slice(1).map((sessionDate) => `demoSession_${result.bookingId}_${sessionDate}_${slotId}`)];
        const scheduledSessions = demoDates.map((sessionDate, index) => ({
          id: sessionIds[index], date: sessionDate, index,
          startTime: slot.startTime, endTime: slot.endTime,
        }));
        const classSessions = await adminDb.collection("class_sessions").where("teacherId", "==", match.teacher.id).get();
        const conflicts = scheduledSessions.slice(1).some((entry) => classSessions.docs.some((sessionDoc) => {
          const session = sessionDoc.data();
          return !["ENDED", "COMPLETED", "CANCELLED"].includes(String(session.status || "").toUpperCase()) &&
            String(session.date || "").slice(0, 10) === entry.date && String(session.slotId || "") === slotId;
        }));
        if (conflicts) throw new Error("TEACHER_SLOT_BUSY");
        const scheduleBatch = adminDb.batch();
        for (const entry of scheduledSessions) {
          const sessionRef = adminDb.collection("class_sessions").doc(entry.id);
          const lockRef = adminDb.collection("teacher_slot_locks").doc(`${match.teacher.id}_${entry.date}_${slotId}`);
          const studentLockRef = adminDb.collection("student_slot_locks").doc(`${user.uid}_${entry.date}_${slotId}`);
          const [teacherLock, studentLock] = entry.index === 0 ? [null, null] : await Promise.all([lockRef.get(), studentLockRef.get()]);
          if ((teacherLock?.exists && teacherLock.data()?.active && teacherLock.data()?.batchId !== result.batchId) || (studentLock?.exists && studentLock.data()?.active && studentLock.data()?.batchId !== result.batchId)) throw new Error("TEACHER_SLOT_BUSY");
          scheduleBatch.set(sessionRef, {
            id: entry.id, type: "DEMO", demoBookingId: result.bookingId,
            demoSessionIds: sessionIds, demoSessionIndex: entry.index, demoSessionCount: 3,
            batchId: result.batchId, teacherId: match.teacher.id,
            studentIds: result.paymentStatus === "NOT_REQUIRED" ? [user.uid] : [],
            title: `Class ${classNumber} · ${program.subjects.join(" + ")}`,
            subject: program.subjects.join(" + "), className: `Class ${classNumber}`,
            classNumber, board, programId, date: entry.date, slotId,
            startTime: entry.startTime, endTime: entry.endTime,
            scheduledAt: new Date(`${entry.date}T${entry.startTime}:00+05:30`),
            status: "SCHEDULED", durationMinutes: 60,
            liveRoomId: `blanklearn_${entry.id}`, livekitRoomName: `blanklearn_${entry.id}`,
            createdAt: new Date(), updatedAt: new Date(),
          }, { merge: true });
          if (entry.index > 0) {
            scheduleBatch.set(lockRef, { teacherId: match.teacher.id, date: entry.date, slotId, batchId: result.batchId, active: true, createdAt: new Date(), updatedAt: new Date() }, { merge: true });
            scheduleBatch.set(studentLockRef, { studentId: user.uid, date: entry.date, slotId, batchId: result.batchId, active: true, createdAt: new Date(), updatedAt: new Date() }, { merge: true });
          }
        }
        scheduleBatch.set(adminDb.collection("demo_bookings").doc(result.bookingId), {
          sessionIds, demoSessionIds: sessionIds, demoSessionCount: 3, updatedAt: new Date(),
        }, { merge: true });
        scheduleBatch.set(adminDb.collection("enrollments").doc(`${result.batchId}_${user.uid}`), { sessionIds, updatedAt: new Date() }, { merge: true });
        await scheduleBatch.commit();

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
