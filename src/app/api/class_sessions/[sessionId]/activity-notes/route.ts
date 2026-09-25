import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const sessionId = (await context.params).sessionId;
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });

    const user = await adminAuth.verifyIdToken(token);
    const sessionRef = adminDb.collection("class_sessions").doc(sessionId);
    const sessionSnapshot = await sessionRef.get();
    if (!sessionSnapshot.exists) return NextResponse.json({ success: false, error: "SESSION_NOT_FOUND" }, { status: 404 });

    const session = sessionSnapshot.data() || {};
    if ((session.teacherId || session.teacherUid) !== user.uid) {
      return NextResponse.json({ success: false, error: "SESSION_ACCESS_DENIED" }, { status: 403 });
    }
    if (["ENDED", "COMPLETED", "CANCELLED"].includes(String(session.status || ""))) {
      return NextResponse.json({ success: false, error: "SESSION_ALREADY_ENDED" }, { status: 409 });
    }

    const body = await request.json();
    const generatedNotes = typeof body.generatedNotes === "string" ? body.generatedNotes.trim().slice(0, 1800) : "";
    if (!generatedNotes) return NextResponse.json({ success: false, error: "NOTES_REQUIRED" }, { status: 400 });

    await sessionRef.update({ generatedNotes, generatedNotesUpdatedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Class activity notes save failed:", error);
    return NextResponse.json({ success: false, error: "NOTES_SAVE_FAILED" }, { status: 500 });
  }
}
