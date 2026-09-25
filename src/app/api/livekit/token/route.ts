import { studentAccess } from "@/lib/classroom/studentAccess";
import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import type { DocumentData, QuerySnapshot } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase/admin";

type UserRole = "TEACHER" | "STUDENT" | "ADMIN";

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

interface SessionData extends DocumentData {
  id: string;
  teacherId?: string;
  teacherUid?: string;
  studentIds?: string[];
  students?: string[];
  batchId?: string;
  status?: SessionStatus;
  liveRoomId?: string;
  livekitRoomName?: string;
  roomName?: string;
  roomId?: string;
  title?: string;
  subject?: string;
  className?: string;
}

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7).trim();
  return token || null;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.length > 0,
  );
}

async function getSession(sessionId: string) {
  const snapshot = await adminDb
    .collection("class_sessions")
    .doc(sessionId)
    .get();

  if (!snapshot.exists) return null;

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as SessionData;
}

async function isStudentAuthorized(
  uid: string,
  session: SessionData,
) {
  const directStudentIds = stringArray(session.studentIds);
  const directStudents = stringArray(session.students);

  if (
    directStudentIds.includes(uid) ||
    directStudents.includes(uid)
  ) {
    return true;
  }

  if (!session.batchId) return false;

  const hasEligibleMembership = (snapshot: QuerySnapshot) =>
    snapshot.docs.some((item) => {
      const data = item.data();
      const status = String(data.membershipStatus || data.status || "").toUpperCase();
      return !status || ["TRIAL", "ACTIVE", "ENROLLED"].includes(status);
    });

  const byStudentId = await adminDb
    .collection("enrollments")
    .where("batchId", "==", session.batchId)
    .where("studentId", "==", uid)
    .limit(1)
    .get();

  if (hasEligibleMembership(byStudentId)) return true;

  const byUserId = await adminDb
    .collection("enrollments")
    .where("batchId", "==", session.batchId)
    .where("userId", "==", uid)
    .limit(1)
    .get();

  return hasEligibleMembership(byUserId);
}

function canTeacherJoin(status: SessionStatus) {
  return (
    status === "SCHEDULED" ||
    status === "PREPARING" ||
    status === "OPEN_FOR_JOIN" ||
    status === "LIVE" ||
    status === "PAUSED" ||
    status === "TECHNICAL_ISSUE"
  );
}

function canStudentJoin(status: SessionStatus) {
  return (
    status === "OPEN_FOR_JOIN" ||
    status === "LIVE"
  );
}

/**
 * Important role rule:
 *
 * We do NOT trust users/{uid}.role as the only source of truth.
 *
 * A Firebase account may have both:
 *   teachers/{uid}
 *   students/{uid}
 *
 * The session itself tells us which capability is being requested:
 * - session.teacherId === uid -> TEACHER
 * - otherwise authorized student -> STUDENT
 *
 * This prevents the old "student role overwrote teacher role" bug.
 */
async function resolveSessionRole(
  uid: string,
  session: SessionData,
): Promise<UserRole | null> {
  const sessionTeacherId =
    session.teacherId || session.teacherUid;

  if (sessionTeacherId === uid) {
    const teacherSnapshot = await adminDb
      .collection("teachers")
      .doc(uid)
      .get();

    if (teacherSnapshot.exists) {
      return "TEACHER";
    }
  }

  const authorizedStudent =
    await isStudentAuthorized(uid, session);

  if (authorizedStudent) {
    const studentSnapshot = await adminDb
      .collection("students")
      .doc(uid)
      .get();

    if (studentSnapshot.exists) {
      return "STUDENT";
    }

    // Keep compatibility with existing student data where
    // the enrollment/session relationship is authoritative.
    return "STUDENT";
  }

  const userSnapshot = await adminDb
    .collection("users")
    .doc(uid)
    .get();

  const userRole = userSnapshot.exists
    ? userSnapshot.data()?.role
    : undefined;

  if (userRole === "ADMIN") {
    return "ADMIN";
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const idToken = bearerToken(request);

    if (!idToken) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        { status: 401 },
      );
    }

    const decodedToken =
      await adminAuth.verifyIdToken(idToken);

    const uid = decodedToken.uid;

    const sessionId =
      request.nextUrl.searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: "SESSION_ID_REQUIRED",
        },
        { status: 400 },
      );
    }

   const livekitUrl = process.env.LIVEKIT_URL?.trim();
const livekitApiKey = process.env.LIVEKIT_API_KEY?.trim();
const livekitApiSecret = process.env.LIVEKIT_API_SECRET?.trim();

console.log("LIVEKIT ENV CHECK:", {
  url: !!livekitUrl,
  key: !!livekitApiKey,
  secret: !!livekitApiSecret,
});

if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
  console.error("LIVEKIT ENV MISSING:", {
    url: !!livekitUrl,
    key: !!livekitApiKey,
    secret: !!livekitApiSecret,
  });

  return NextResponse.json(
    {
      success: false,
      error: "LIVEKIT_CONFIGURATION_ERROR",
    },
    { status: 500 }
  );
}

    const session = await getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "SESSION_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    const status: SessionStatus =
      session.status || "SCHEDULED";

    const role = await resolveSessionRole(uid, session);

    if (!role) {
      return NextResponse.json(
        {
          success: false,
          error: "SESSION_ACCESS_DENIED",
          message:
            "You are not authorized to access this classroom.",
        },
        { status: 403 },
      );
    }

    if (role === "TEACHER") {
      const teacherSnapshot = await adminDb
        .collection("teachers")
        .doc(uid)
        .get();

      if (!teacherSnapshot.exists) {
        return NextResponse.json(
          {
            success: false,
            error: "TEACHER_PROFILE_NOT_FOUND",
          },
          { status: 403 },
        );
      }

      const teacher = teacherSnapshot.data();

      if (teacher?.applicationStatus !== "APPROVED") {
        return NextResponse.json(
          {
            success: false,
            error: "TEACHER_NOT_APPROVED",
            message:
              "Teacher application is not approved.",
          },
          { status: 403 },
        );
      }

      const kycStatus = String(teacher?.kycStatus || teacher?.kyc?.status || "").trim().toUpperCase();
      if (!["VERIFIED", "APPROVED"].includes(kycStatus)) {
        return NextResponse.json(
          {
            success: false,
            error: "TEACHER_KYC_NOT_VERIFIED",
            message:
              "Teacher KYC is not verified.",
          },
          { status: 403 },
        );
      }

      const sessionTeacherId =
        session.teacherId || session.teacherUid;

      if (sessionTeacherId !== uid) {
        return NextResponse.json(
          {
            success: false,
            error: "SESSION_ACCESS_DENIED",
          },
          { status: 403 },
        );
      }

      if (!canTeacherJoin(status)) {
        return NextResponse.json(
          {
            success: false,
            error: "SESSION_NOT_AVAILABLE",
            message:
              `Teacher cannot join a ${status} session.`,
          },
          { status: 409 },
        );
      }
    }

    if (role === "STUDENT") {
      if (!canStudentJoin(status)) {
        return NextResponse.json(
          {
            success: false,
            error: "SESSION_NOT_OPEN",
            message:
              status === "SCHEDULED"
                ? "Teacher has not opened the class yet."
                : `Students cannot join a ${status} session.`,
          },
          { status: 409 },
        );
      }

      const authorized =
        await isStudentAuthorized(uid, session);

      if (!authorized) {
        return NextResponse.json(
          {
            success: false,
            error: "STUDENT_NOT_ENROLLED",
            message:
              "You are not enrolled in this class.",
          },
          { status: 403 },
        );
      }
    }

    if (role === "ADMIN") {
      if (
        status === "ENDED" ||
        status === "COMPLETED" ||
        status === "CANCELLED"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "SESSION_NOT_ACTIVE",
          },
          { status: 409 },
        );
      }
    }

    const roomName =
      session.liveRoomId ||
      session.livekitRoomName ||
      session.roomName ||
      session.roomId ||
      `blanklearn_${sessionId}`;

    const participantIdentity =
      `${role.toLowerCase()}_${uid}`;

    let participantName =
      decodedToken.name ||
      decodedToken.email ||
      "Participant";

    if (role === "TEACHER") {
      const teacherSnapshot = await adminDb
        .collection("teachers")
        .doc(uid)
        .get();

      if (teacherSnapshot.exists) {
        const teacher = teacherSnapshot.data();

        participantName =
          teacher?.name ||
          teacher?.displayName ||
          teacher?.fullName ||
          participantName;
      }
    }

    if (role === "STUDENT") {
      const studentSnapshot = await adminDb
        .collection("students")
        .doc(uid)
        .get();

      if (studentSnapshot.exists) {
        const student = studentSnapshot.data();

        participantName =
          student?.name ||
          student?.displayName ||
          student?.fullName ||
          participantName;
      }
    }

    const accessToken = new AccessToken(
      livekitApiKey,
      livekitApiSecret,
      {
        identity: participantIdentity,
        name: participantName,
        ttl: "2h",
      },
    );

    accessToken.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await accessToken.toJwt();

    return NextResponse.json({
      success: true,
      token: jwt,
      serverUrl: livekitUrl,
      roomName,
      participantName,
      session: {
        id: sessionId,
        status,
        role,
        participantName,
        title: session.title || "Live Class",
        subject: session.subject || "",
        className: session.className || "",
      },
    });
  } catch (error) {
    console.error("LiveKit token error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "LIVEKIT_TOKEN_GENERATION_FAILED",
      },
      { status: 500 },
    );
  }
}
