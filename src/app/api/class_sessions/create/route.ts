import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase/admin";

interface CreateSessionBody {
  batchId?: string;
  title?: string;
  subject?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  demoBookingId?: string;
}

function errorResponse(
  message: string,
  status: number,
  code: string
) {
  return NextResponse.json(
    {
      success: false,
      code,
      message,
    },
    { status }
  );
}

async function authenticate(
  request: NextRequest
) {
  const authorization =
    request.headers.get("authorization");

  if (
    !authorization ||
    !authorization.startsWith("Bearer ")
  ) {
    throw new Error("AUTH_REQUIRED");
  }

  const token =
    authorization
      .slice(7)
      .trim();

  if (!token) {
    throw new Error("AUTH_REQUIRED");
  }

  try {
    return await adminAuth.verifyIdToken(
      token
    );
  } catch {
    throw new Error("AUTH_INVALID");
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * ---------------------------------------------------------------
     * Authentication
     * ---------------------------------------------------------------
     */

    let firebaseUser;

    try {
      firebaseUser =
        await authenticate(request);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "AUTH_INVALID"
      ) {
        return errorResponse(
          "Authentication session is invalid.",
          401,
          "AUTH_INVALID"
        );
      }

      return errorResponse(
        "Please login first.",
        401,
        "AUTH_REQUIRED"
      );
    }

    const teacherId =
      firebaseUser.uid;

    /*
     * ---------------------------------------------------------------
     * Teacher
     * ---------------------------------------------------------------
     */

    const teacherRef =
      adminDb
        .collection("teachers")
        .doc(teacherId);

    const teacherSnapshot =
      await teacherRef.get();

    if (!teacherSnapshot.exists) {
      return errorResponse(
        "Teacher profile not found.",
        403,
        "TEACHER_NOT_FOUND"
      );
    }

    const teacher =
      teacherSnapshot.data() || {};

    const applicationStatus =
      String(
        teacher.applicationStatus || ""
      ).toUpperCase();

    const kycStatus = String(teacher.kycStatus || teacher.kyc?.status || "").trim().toUpperCase();

    if (
      applicationStatus !==
      "APPROVED"
    ) {
      return errorResponse(
        "Teacher account is not approved.",
        403,
        "TEACHER_NOT_APPROVED"
      );
    }

    if (
      !["VERIFIED", "APPROVED"].includes(kycStatus)
    ) {
      return errorResponse(
        "Teacher KYC is not verified.",
        403,
        "TEACHER_KYC_NOT_VERIFIED"
      );
    }

    /*
     * ---------------------------------------------------------------
     * Request Body
     * ---------------------------------------------------------------
     */

    let body: CreateSessionBody;

    try {
      body =
        await request.json();
    } catch {
      return errorResponse(
        "Invalid request body.",
        400,
        "INVALID_BODY"
      );
    }

    const batchId =
      typeof body.batchId === "string"
        ? body.batchId.trim()
        : "";

    const title =
      typeof body.title === "string" &&
      body.title.trim()
        ? body.title.trim()
        : "Live Class";

    const subject =
      typeof body.subject === "string"
        ? body.subject.trim()
        : "";

    const scheduledAt =
      typeof body.scheduledAt === "string"
        ? body.scheduledAt.trim()
        : "";

    const durationMinutes =
      typeof body.durationMinutes ===
      "number"
        ? body.durationMinutes
        : 60;
    const demoBookingId = typeof body.demoBookingId === "string" ? body.demoBookingId.trim() : "";

    if (!batchId) {
      return errorResponse(
        "batchId is required.",
        400,
        "BATCH_ID_REQUIRED"
      );
    }

    if (
      durationMinutes < 15 ||
      durationMinutes > 180
    ) {
      return errorResponse(
        "Duration must be between 15 and 180 minutes.",
        400,
        "INVALID_DURATION"
      );
    }

    /*
     * ---------------------------------------------------------------
     * Batch
     * ---------------------------------------------------------------
     */

    const batchRef =
      adminDb
        .collection("batches")
        .doc(batchId);

    const batchSnapshot =
      await batchRef.get();

    // Demo rooms are assigned directly through demo_bookings. Some older
    // bookings retain a batchId whose batch document was removed or migrated;
    // that should not prevent the assigned teacher from opening the demo.
    if (!batchSnapshot.exists && !demoBookingId) {
      return errorResponse(
        "Batch not found.",
        404,
        "BATCH_NOT_FOUND"
      );
    }

    const batch = batchSnapshot.exists
      ? batchSnapshot.data() || {}
      : {};

    const batchTeacherId =
      String(
        batch.teacherId ||
          batch.teacherUid ||
          ""
      );

    if (
      !demoBookingId &&
      batchTeacherId &&
      batchTeacherId !== teacherId
    ) {
      return errorResponse(
        "You are not assigned to this batch.",
        403,
        "BATCH_TEACHER_MISMATCH"
      );
    }

    if (demoBookingId) {
      const bookingRef = adminDb.collection("demo_bookings").doc(demoBookingId);
      const bookingSnap = await bookingRef.get();
      if (!bookingSnap.exists) return errorResponse("Demo booking not found.", 404, "DEMO_NOT_FOUND");
      const booking = bookingSnap.data()!;
      if (booking.teacherId !== teacherId) {
        return errorResponse("This demo is not assigned to you.", 403, "DEMO_TEACHER_MISMATCH");
      }

      // Prefer the booking's canonical batch link if it differs from the
      // stale id supplied by the dashboard. Session ownership remains tied
      // to this teacher-owned booking.
      const resolvedBatchId = String(booking.batchId || batchId);

      const date = String(booking.date || "");
      const slotId = String(booking.slotId || "");
      const deterministicId = `session_${createHash("sha256").update(`${resolvedBatchId}_${date}_${slotId}`).digest("hex")}`;
      let sessionIdForDemo = String(booking.sessionId || deterministicId);
      let sessionRefForDemo = adminDb.collection("class_sessions").doc(sessionIdForDemo);
      let existingSession = await sessionRefForDemo.get();
      if (existingSession.exists) {
        const existing = existingSession.data()!;
        if (existing.teacherId !== teacherId || (existing.batchId && existing.batchId !== resolvedBatchId)) {
          return errorResponse("The linked classroom belongs to a different class.", 409, "SESSION_LINK_CONFLICT");
        }
        const existingStatus = String(existing.status || "SCHEDULED").toUpperCase();
        if (!["ENDED", "COMPLETED", "CANCELLED"].includes(existingStatus)) {
          await bookingRef.set({ sessionId: sessionIdForDemo, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
          return NextResponse.json({ success: true, session: { id: sessionIdForDemo, batchId: resolvedBatchId, teacherId, status: existingStatus } });
        }

        // A demo booking can be used for classroom QA or a later retry.
        // Keep its closed session intact for follow-up and link a fresh room.
        sessionIdForDemo = adminDb.collection("class_sessions").doc().id;
        sessionRefForDemo = adminDb.collection("class_sessions").doc(sessionIdForDemo);
        existingSession = await sessionRefForDemo.get();
      }

      const roomName = `blanklearn_${sessionIdForDemo}`;
      const studentIds = Array.from(new Set([
        ...(batchTeacherId === teacherId && Array.isArray(batch.studentIds) ? batch.studentIds.filter((id: unknown): id is string => typeof id === "string") : []),
        ...(booking.studentId ? [String(booking.studentId)] : []),
      ]));
      const scheduledAt = date && booking.startTime ? new Date(`${date}T${booking.startTime}:00+05:30`) : null;
      const sessionData = {
        id: sessionIdForDemo,
        batchId: resolvedBatchId,
        teacherId,
        studentIds,
        title: booking.studentName ? `Demo class · ${booking.studentName}` : title,
        subject: subject || (Array.isArray(booking.subjects) ? booking.subjects.join(" + ") : String(booking.subject || "")),
        subjects: booking.subjects || [],
        className: `Class ${booking.classNumber || ""}`.trim(),
        classNumber: booking.classNumber || null,
        board: booking.board || null,
        programId: booking.programId || null,
        type: "DEMO",
        date,
        startTime: booking.startTime || "",
        endTime: booking.endTime || "",
        slotId,
        status: "SCHEDULED",
        scheduledAt: scheduledAt && !Number.isNaN(scheduledAt.getTime()) ? scheduledAt : null,
        durationMinutes,
        liveRoomId: roomName,
        livekitRoomName: roomName,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      await adminDb.runTransaction(async (transaction) => {
        const [freshBooking, freshSession] = await Promise.all([
          transaction.get(bookingRef),
          transaction.get(sessionRefForDemo),
        ]);
        if (!freshBooking.exists || freshBooking.data()?.teacherId !== teacherId) {
          throw new Error("DEMO_TEACHER_MISMATCH");
        }
        if (freshSession.exists) {
          const fresh = freshSession.data()!;
          if (fresh.teacherId !== teacherId || (fresh.batchId && fresh.batchId !== resolvedBatchId)) throw new Error("SESSION_LINK_CONFLICT");
          transaction.set(bookingRef, { sessionId: sessionIdForDemo, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        } else {
          transaction.create(sessionRefForDemo, sessionData);
          transaction.set(bookingRef, { sessionId: sessionIdForDemo, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        }
      });
      return NextResponse.json({ success: true, session: { id: sessionIdForDemo, batchId: resolvedBatchId, teacherId, status: "SCHEDULED" } }, { status: 201 });
    }

    /*
     * ---------------------------------------------------------------
     * Students
     * ---------------------------------------------------------------
     */

    let studentIds: string[] = [];

    if (
      Array.isArray(
        batch.studentIds
      )
    ) {
      studentIds =
        batch.studentIds
          .filter(
            (id): id is string =>
              typeof id === "string"
          )
          .map((id) => id.trim())
          .filter(Boolean);
    }

    /*
     * Support another common schema:
     * batch.students = [{ studentId: "..." }]
     */

    if (
      studentIds.length === 0 &&
      Array.isArray(batch.students)
    ) {
      studentIds =
        batch.students
          .map((student: unknown) => {
            if (
              typeof student ===
              "string"
            ) {
              return student;
            }

            if (
              typeof student ===
                "object" &&
              student !== null
            ) {
              const value =
                student as Record<
                  string,
                  unknown
                >;

              if (
                typeof value.studentId ===
                "string"
              ) {
                return value.studentId;
              }

              if (
                typeof value.uid ===
                "string"
              ) {
                return value.uid;
              }
            }

            return "";
          })
          .map((id) => id.trim())
          .filter(Boolean);
    }

    /*
     * ---------------------------------------------------------------
     * Create Session
     * ---------------------------------------------------------------
     */

    const sessionRef =
      adminDb
        .collection("class_sessions")
        .doc();

    const sessionId =
      sessionRef.id;

    const roomName =
      `blanklearn_${sessionId}`;

    const sessionData = {
      id: sessionId,

      batchId,

      teacherId,

      studentIds,

      title,

      subject,

      status: "SCHEDULED",

      scheduledAt:
        scheduledAt || null,

      durationMinutes,

      liveRoomId: roomName,

      livekitRoomName: roomName,

      createdAt:
        FieldValue.serverTimestamp(),

      updatedAt:
        FieldValue.serverTimestamp(),
    };

    await sessionRef.set(
      sessionData
    );

    /*
     * ---------------------------------------------------------------
     * Response
     * ---------------------------------------------------------------
     */

    return NextResponse.json(
      {
        success: true,

        session: {
          id: sessionId,
          batchId,
          teacherId,
          studentIds,
          title,
          subject,
          status: "SCHEDULED",
          scheduledAt:
            scheduledAt || null,
          durationMinutes,
          roomName,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Create class session error:",
      error
    );

    return errorResponse(
      "Unable to create class session.",
      500,
      "SESSION_CREATE_ERROR"
    );
  }
}
