import { studentAccess } from "@/lib/classroom/studentAccess";
import { NextRequest, NextResponse } from "next/server";
import {
  FieldValue,
  type DocumentData,
} from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase/admin";

type SessionStatus =
  | "SCHEDULED"
  | "PREPARING"
  | "OPEN_FOR_JOIN"
  | "LIVE"
  | "PAUSED"
  | "TECHNICAL_ISSUE"
  | "ENDED"
  | "PROCESSING"
  | "COMPLETED"
  | "CANCELLED";

const VALID_STATUSES: SessionStatus[] = [
  "SCHEDULED",
  "PREPARING",
  "OPEN_FOR_JOIN",
  "LIVE",
  "PAUSED",
  "TECHNICAL_ISSUE",
  "ENDED",
  "PROCESSING",
  "COMPLETED",
  "CANCELLED",
];

interface RouteContext {
  params: Promise<{
    sessionId: string;
  }>;
}

function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.substring(7).trim();
}

function getStringArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.length > 0
  );
}

function getUserRole(
  userData: DocumentData | undefined
) {
  const role = userData?.role;

  if (
    role === "TEACHER" ||
    role === "STUDENT" ||
    role === "PARENT" ||
    role === "ADMIN"
  ) {
    return role;
  }

  return null;
}

async function getAuthenticatedUser(
  request: NextRequest
) {
  const idToken = getBearerToken(request);

  if (!idToken) {
    throw new Error("UNAUTHORIZED");
  }

  return adminAuth.verifyIdToken(idToken);
}

async function getSession(
  sessionId: string
) {
  const snapshot = await adminDb
    .collection("class_sessions")
    .doc(sessionId)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as DocumentData & {
    id: string;
  };
}

async function authorizeSessionAccess(
  uid: string,
  session: DocumentData
) {
  const userSnapshot = await adminDb
    .collection("users")
    .doc(uid)
    .get();

  const userData = userSnapshot.exists
    ? userSnapshot.data()
    : undefined;

  let role = getUserRole(userData);

  /*
   * Fallback: determine role from teacher/student documents.
   */
  if (!role) {
    const teacherSnapshot = await adminDb
      .collection("teachers")
      .doc(uid)
      .get();

    if (teacherSnapshot.exists) {
      role = "TEACHER";
    }
  }

  if (!role) {
    const studentSnapshot = await adminDb
      .collection("students")
      .doc(uid)
      .get();

    if (studentSnapshot.exists) {
      role = "STUDENT";
    }
  }

  /*
   * Admin
   */
  if (role === "ADMIN") {
    return {
      authorized: true,
      role,
    };
  }

  /*
   * Teacher
   */
  if (role === "TEACHER") {
    const teacherSnapshot = await adminDb
      .collection("teachers")
      .doc(uid)
      .get();

    if (!teacherSnapshot.exists) {
      return {
        authorized: false,
        role,
      };
    }

    const teacher = teacherSnapshot.data();

    const teacherApproved =
      teacher?.applicationStatus === "APPROVED";

    const kycStatus = String(teacher?.kycStatus || teacher?.kyc?.status || "").trim().toUpperCase();
    const teacherVerified = ["VERIFIED", "APPROVED"].includes(kycStatus);

    const sessionTeacherId =
      session.teacherId || session.teacherUid;

    if (
      teacherApproved &&
      teacherVerified &&
      sessionTeacherId === uid
    ) {
      return {
        authorized: true,
        role,
      };
    }

    return {
      authorized: false,
      role,
    };
  }

  /*
   * Student
   */
  if (role === "STUDENT") {
    const studentSnapshot = await adminDb
      .collection("students")
      .doc(uid)
      .get();

    if (!studentSnapshot.exists) {
      return {
        authorized: false,
        role,
      };
    }

    const student = studentSnapshot.data();

    const studentIds = getStringArray(
      session.studentIds
    );

    const students = getStringArray(
      session.students
    );

    const directAccess =
      studentIds.includes(uid) ||
      students.includes(uid);

    /*
     * If session has explicit student IDs,
     * direct membership is enough.
     */
    if (directAccess) {
      return {
        authorized: true,
        role,
      };
    }

    /*
     * Fallback to batch enrollment.
     */
    const batchId =
      typeof session.batchId === "string"
        ? session.batchId
        : "";

    if (batchId) {
      const enrollmentSnapshot = await adminDb
        .collection("enrollments")
        .where("batchId", "==", batchId)
        .where("studentId", "==", uid)
        .limit(1)
        .get();

      const hasEligibleEnrollment = (snapshot: typeof enrollmentSnapshot) =>
        snapshot.docs.some((item) => {
          const data = item.data();
          const membershipStatus = String(data.membershipStatus || data.status || "").toUpperCase();
          return !membershipStatus || ["TRIAL", "ACTIVE", "ENROLLED"].includes(membershipStatus);
        });

      if (hasEligibleEnrollment(enrollmentSnapshot)) {
        return {
          authorized: true,
          role,
        };
      }

      /*
       * Alternative enrollment shape:
       * userId instead of studentId.
       */
      const alternativeEnrollmentSnapshot =
        await adminDb
          .collection("enrollments")
          .where("batchId", "==", batchId)
          .where("userId", "==", uid)
          .limit(1)
          .get();

      if (hasEligibleEnrollment(alternativeEnrollmentSnapshot)) {
        return {
          authorized: true,
          role,
        };
      }
    }

    return {
      authorized: false,
      role,
    };
  }

  return {
    authorized: false,
    role,
  };
}

/*
 * GET
 *
 * Used by student/teacher classroom pages
 * to know the current session state.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { sessionId } = await context.params;

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: "SESSION_ID_REQUIRED",
        },
        { status: 400 }
      );
    }

    const decodedToken =
      await getAuthenticatedUser(request);

    const session = await getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "SESSION_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const access = await authorizeSessionAccess(
      decodedToken.uid,
      session
    );

    if (!access.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: "SESSION_ACCESS_DENIED",
        },
        { status: 403 }
      );
    }

    const status: SessionStatus =
      VALID_STATUSES.includes(session.status)
        ? session.status
        : "SCHEDULED";
    const sessionDemoCount = Number(session.demoSessionCount || 1);
    const legacyDemoCompleted = sessionDemoCount <= 1 && ["ENDED", "COMPLETED"].includes(String(session.status || "").toUpperCase());

    let demoBooking: DocumentData | undefined;
    let demoBookingId: string | null = null;
    if (session.demoBookingId) {
      const bookingSnapshot = await adminDb.collection("demo_bookings").doc(String(session.demoBookingId)).get();
      if (bookingSnapshot.exists) {
        demoBooking = bookingSnapshot.data();
        demoBookingId = bookingSnapshot.id;
      }
    } else {
      const bookingQuery = await adminDb.collection("demo_bookings").where("sessionIds", "array-contains", session.id).limit(1).get();
      if (!bookingQuery.empty) {
        demoBooking = bookingQuery.docs[0].data();
        demoBookingId = bookingQuery.docs[0].id;
      } else {
        const legacyBookingQuery = await adminDb.collection("demo_bookings").where("sessionId", "==", session.id).limit(1).get();
        if (!legacyBookingQuery.empty) {
          demoBooking = legacyBookingQuery.docs[0].data();
          demoBookingId = legacyBookingQuery.docs[0].id;
        }
      }
    }
    const isDemo = String(session.type || "").toUpperCase() === "DEMO" || Boolean(demoBookingId);
    const endedAtValue = session.endedAt || session.updatedAt || null;
    const endedAt = endedAtValue && typeof endedAtValue.toDate === "function"
      ? endedAtValue.toDate().toISOString()
      : endedAtValue instanceof Date
        ? endedAtValue.toISOString()
        : null;

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        status,
        teacherId:
          session.teacherId ||
          session.teacherUid ||
          null,
        studentIds:
          getStringArray(session.studentIds),
        batchId: session.batchId || null,
        title: session.title || "Live Class",
        subject: session.subject || null,
        isDemo,
        demoBookingId,
        endedAt,
        demoSessionIndex: Number(session.demoSessionIndex || 0),
        demoSessionCount: Number(demoBooking?.demoSessionCount || session.demoSessionCount || 1),
        demoSessionIds: getStringArray(demoBooking?.sessionIds || session.demoSessionIds),
        demoStatus: String(demoBooking?.demoStatus || (legacyDemoCompleted ? "COMPLETED" : "ACTIVE")),
        demoCompletedAt: demoBooking?.demoCompletedAt && typeof demoBooking.demoCompletedAt.toDate === "function"
          ? demoBooking.demoCompletedAt.toDate().toISOString()
          : legacyDemoCompleted && endedAt ? endedAt : null,
        role: access.role,
      },
    });
  } catch (error) {
    console.error(
      "GET session status error:",
      error
    );

    if (
      error instanceof Error &&
      error.message === "UNAUTHORIZED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}

/*
 * PATCH
 *
 * Teacher only.
 *
 * Updates:
 * SCHEDULED -> OPEN_FOR_JOIN
 * OPEN_FOR_JOIN -> LIVE
 * LIVE -> ENDED
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { sessionId } = await context.params;

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: "SESSION_ID_REQUIRED",
        },
        { status: 400 }
      );
    }

    const decodedToken =
      await getAuthenticatedUser(request);

    const teacherSnapshot = await adminDb
      .collection("teachers")
      .doc(decodedToken.uid)
      .get();

    if (!teacherSnapshot.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "TEACHER_PROFILE_NOT_FOUND",
        },
        { status: 403 }
      );
    }

    const teacher =
      teacherSnapshot.data();

    if (
      teacher?.applicationStatus !== "APPROVED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "TEACHER_NOT_APPROVED",
        },
        { status: 403 }
      );
    }

    const kycStatus = String(teacher?.kycStatus || teacher?.kyc?.status || "").trim().toUpperCase();
    if (!["VERIFIED", "APPROVED"].includes(kycStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: "TEACHER_KYC_NOT_VERIFIED",
        },
        { status: 403 }
      );
    }

    const sessionRef = adminDb
      .collection("class_sessions")
      .doc(sessionId);

    const sessionSnapshot =
      await sessionRef.get();

    if (!sessionSnapshot.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "SESSION_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const session =
      sessionSnapshot.data();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "SESSION_DATA_MISSING",
        },
        { status: 500 }
      );
    }

    const sessionTeacherId =
      session.teacherId ||
      session.teacherUid;

    if (sessionTeacherId !== decodedToken.uid) {
      return NextResponse.json(
        {
          success: false,
          error: "SESSION_ACCESS_DENIED",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const nextStatus =
      body?.status as SessionStatus;

    if (!VALID_STATUSES.includes(nextStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_STATUS",
        },
        { status: 400 }
      );
    }

    const currentStatus =
      session.status as SessionStatus;

    const transitions: Record<
      SessionStatus,
      SessionStatus[]
    > = {
      SCHEDULED: [
        "OPEN_FOR_JOIN",
        "LIVE",
        "CANCELLED",
      ],

      PREPARING: [
        "OPEN_FOR_JOIN",
        "LIVE",
        "CANCELLED",
      ],

      OPEN_FOR_JOIN: [
        "LIVE",
        "ENDED",
        "CANCELLED",
      ],

      LIVE: [
        "ENDED",
        "PAUSED",
        "TECHNICAL_ISSUE",
      ],

      PAUSED: [
        "LIVE",
        "ENDED",
        "TECHNICAL_ISSUE",
      ],

      TECHNICAL_ISSUE: [
        "LIVE",
        "PAUSED",
        "ENDED",
      ],

      ENDED: [],

      PROCESSING: [],

      COMPLETED: [],

      CANCELLED: [],
    };

    if (
      currentStatus !== nextStatus &&
      !transitions[currentStatus]?.includes(
        nextStatus
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_STATUS_TRANSITION",
          message: `Cannot change session from ${currentStatus} to ${nextStatus}.`,
        },
        { status: 409 }
      );
    }

    const updateData: Record<
      string,
      unknown
    > = {
      status: nextStatus,
      updatedAt:
        FieldValue.serverTimestamp(),
    };

    if (nextStatus === "OPEN_FOR_JOIN") {
      updateData.openedAt =
        FieldValue.serverTimestamp();
    }

    if (nextStatus === "LIVE") {
      updateData.startedAt =
        FieldValue.serverTimestamp();
    }

    if (nextStatus === "ENDED") {
      updateData.endedAt =
        FieldValue.serverTimestamp();
    }

    if (nextStatus === "ENDED" && String(session.type || "").toUpperCase() === "DEMO" && session.demoBookingId) {
      const bookingRef = adminDb.collection("demo_bookings").doc(String(session.demoBookingId));
      await adminDb.runTransaction(async (transaction) => {
        const bookingSnapshot = await transaction.get(bookingRef);
        const booking = bookingSnapshot.data() || {};
        const sessionIds = getStringArray(booking.sessionIds || session.demoSessionIds || [sessionId]);
        const completedIds = new Set(getStringArray(booking.completedSessionIds));
        completedIds.add(sessionId);
        const allComplete = sessionIds.length >= Number(booking.demoSessionCount || session.demoSessionCount || 1) && sessionIds.every((id) => completedIds.has(id));
        transaction.update(sessionRef, updateData as FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>);
        if (bookingSnapshot.exists) {
          transaction.update(bookingRef, {
            completedSessionIds: [...completedIds],
            demoStatus: allComplete ? "COMPLETED" : "ACTIVE",
            ...(allComplete && !booking.demoCompletedAt ? { demoCompletedAt: FieldValue.serverTimestamp() } : {}),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      });
    } else {
      await sessionRef.update(updateData);
    }

    return NextResponse.json({
      success: true,
      session: {
        id: sessionId,
        status: nextStatus,
      },
    });
  } catch (error) {
    console.error(
      "PATCH session status error:",
      error
    );

    if (
      error instanceof Error &&
      error.message === "UNAUTHORIZED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
