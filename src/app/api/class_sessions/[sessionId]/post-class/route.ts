import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

interface RouteContext {
  params: Promise<{
    sessionId: string;
  }>;
}

type Attendance = Record<string, boolean>;

interface PostClassBody {
  attendance?: Attendance;
  summary?: string;
  notes?: string;
}

function getBearerToken(
  request: NextRequest
): string | null {
  const header =
    request.headers.get("authorization");

  if (!header) {
    return null;
  }

  const match =
    header.match(/^Bearer\s+(.+)$/i);

  return match?.[1] || null;
}

function cleanText(
  value: unknown,
  maxLength: number
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { sessionId } =
      await context.params;

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: "Session ID is required.",
        },
        { status: 400 }
      );
    }

    /* ---------------------------------------
       1. Authenticate teacher
    --------------------------------------- */

    const idToken =
      getBearerToken(request);

    if (!idToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    let decodedToken;

    try {
      decodedToken =
        await adminAuth.verifyIdToken(
          idToken
        );
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid authentication token.",
        },
        { status: 401 }
      );
    }

    const teacherId =
      decodedToken.uid;

    /* ---------------------------------------
       2. Read request body
    --------------------------------------- */

    let body: PostClassBody;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const summary = cleanText(
      body.summary,
      2000
    );

    const notes = cleanText(
      body.notes,
      2000
    );

    const attendance =
      body.attendance &&
      typeof body.attendance === "object"
        ? body.attendance
        : {};

    if (!summary) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Class summary is required.",
        },
        { status: 400 }
      );
    }

    /* ---------------------------------------
       3. Load session
    --------------------------------------- */

    const sessionRef = adminDb
      .collection("class_sessions")
      .doc(sessionId);

    const sessionSnap =
      await sessionRef.get();

    if (!sessionSnap.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "Class session not found.",
        },
        { status: 404 }
      );
    }

    const session =
      sessionSnap.data();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Class session data is unavailable.",
        },
        { status: 404 }
      );
    }

    /* ---------------------------------------
       4. Verify teacher ownership
    --------------------------------------- */

    if (
      (session.teacherId || session.teacherUid) !== teacherId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You are not assigned to this class.",
        },
        { status: 403 }
      );
    }

    /* ---------------------------------------
       5. Verify class is actually ended
    --------------------------------------- */

    if (session.status !== "ENDED") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Post-class details can only be submitted after the class has ended.",
        },
        { status: 409 }
      );
    }

    /* ---------------------------------------
       6. Validate attendance IDs
    --------------------------------------- */

    const roster = Array.isArray(session.studentIds)
      ? session.studentIds
      : Array.isArray(session.students)
        ? session.students.map((student: any) => typeof student === "string" ? student : student?.studentId || student?.uid)
        : [];
    const sessionStudentIds =
      Array.isArray(roster)
        ? roster.filter(
            (id: unknown): id is string =>
              typeof id === "string"
          )
        : [];

    const validAttendance: Attendance =
      {};

    for (const studentId of sessionStudentIds) {
      validAttendance[studentId] =
        attendance[studentId] === true;
    }

    /* ---------------------------------------
       7. Prevent duplicate submission
    --------------------------------------- */

    const postClassRef = adminDb
      .collection("class_sessions")
      .doc(sessionId)
      .collection("post_class")
      .doc("teacher");

    const existingPostClass =
      await postClassRef.get();

    if (existingPostClass.exists) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Post-class details have already been submitted.",
        },
        { status: 409 }
      );
    }

    /* ---------------------------------------
       8. Save post-class data
    --------------------------------------- */

    const presentCount =
      Object.values(
        validAttendance
      ).filter(Boolean).length;

    const absentCount =
      sessionStudentIds.length -
      presentCount;

    await adminDb.runTransaction(
      async (transaction) => {
        transaction.set(
          postClassRef,
          {
            sessionId,
            teacherId,
            attendance: validAttendance,
            presentCount,
            absentCount,
            totalStudents:
              sessionStudentIds.length,
            summary,
            notes,
            submittedAt:
              FieldValue.serverTimestamp(),
          }
        );

        transaction.update(
          sessionRef,
          {
            postClassSubmitted: true,
            postClassSubmittedAt:
              FieldValue.serverTimestamp(),
            updatedAt:
              FieldValue.serverTimestamp(),
          }
        );
      }
    );

    /* ---------------------------------------
       9. Return success
    --------------------------------------- */

    return NextResponse.json({
      success: true,
      sessionId,
      attendance: {
        total:
          sessionStudentIds.length,
        present: presentCount,
        absent: absentCount,
      },
    });
  } catch (error) {
    console.error(
      "POST /api/class_sessions/[sessionId]/post-class:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Internal server error.",
      },
      { status: 500 }
    );
  }
}
