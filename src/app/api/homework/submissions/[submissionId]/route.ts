import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function PATCH(request: NextRequest, context: { params: Promise<{ submissionId: string }> }) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.cookies.get("__session")?.value;
    if (!token) return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
    const user = await adminAuth.verifyIdToken(token);
    if (!(await adminDb.collection("teachers").doc(user.uid).get()).exists) return NextResponse.json({ success: false, message: "Teacher access required." }, { status: 403 });
    const { submissionId } = await context.params;
    const ref = adminDb.collection("submissions").doc(submissionId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ success: false, message: "Submission not found." }, { status: 404 });
    if (snap.data()?.teacherId !== user.uid) return NextResponse.json({ success: false, message: "This submission is not assigned to you." }, { status: 403 });
    const body = await request.json();
    const marks = Number(body.marksObtained);
    const feedback = String(body.teacherFeedback || "").trim().slice(0, 2000);
    if (!Number.isFinite(marks) || marks < 0 || marks > 10 || !feedback) return NextResponse.json({ success: false, message: "Enter a score from 0 to 10 and written feedback." }, { status: 400 });
    await ref.update({ marksObtained: marks, teacherFeedback: feedback, status: "GRADED", gradedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Homework grading failed", error);
    return NextResponse.json({ success: false, message: "Submission could not be graded." }, { status: 500 });
  }
}
