import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function PATCH(request: NextRequest, context: { params: Promise<{ requestId: string }> }) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.cookies.get("__session")?.value;
    if (!token) return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
    const teacher = await adminAuth.verifyIdToken(token);
    const { requestId } = await context.params;
    const teacherSnap = await adminDb.collection("teachers").doc(teacher.uid).get();
    if (!teacherSnap.exists) return NextResponse.json({ success: false, message: "Teacher profile required." }, { status: 403 });
    const teacherData = teacherSnap.data() || {};
    if (teacherData.applicationStatus !== "APPROVED") return NextResponse.json({ success: false, message: "Your teacher profile must be approved before reviewing requests." }, { status: 403 });
    const ref = adminDb.collection("batch_requests").doc(requestId);
    const result = await adminDb.runTransaction(async (transaction) => {
      const requestSnap = await transaction.get(ref);
      if (!requestSnap.exists) return "MISSING";
      if (requestSnap.data()?.status !== "OPEN") return "TAKEN";
      const requestData = requestSnap.data() || {};
      const key = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "").replace(/^(mathematics|maths)$/, "math");
      const subjects = new Set((Array.isArray(teacherData.subjects) ? teacherData.subjects : []).map((item: string) => key(String(item))));
      const grades = new Set((Array.isArray(teacherData.grades) ? teacherData.grades : Array.isArray(teacherData.classesTaught) ? teacherData.classesTaught : []).map((item: string) => String(item).replace(/[^0-9]/g, "")));
      const requestedSubjects = (requestData.subjects || []).map((item: string) => key(String(item)));
      const classNumber = String(requestData.classNumber || "");
      if (!requestedSubjects.length || !requestedSubjects.every((subject: string) => subjects.has(subject)) || (grades.size > 0 && !grades.has(classNumber))) return "FORBIDDEN";
      transaction.update(ref, { status: "REVIEWING", teacherId: teacher.uid, teacherName: teacherData.name || "Teacher", updatedAt: FieldValue.serverTimestamp() });
      return "OK";
    });
    if (result !== "OK") return NextResponse.json({ success: false, message: result === "MISSING" ? "Request not found." : result === "FORBIDDEN" ? "This request does not match your subjects and grades." : "This request is already being handled." }, { status: result === "MISSING" ? 404 : result === "FORBIDDEN" ? 403 : 409 });
    const requestSnap = await ref.get();
    return NextResponse.json({ success: true, studentId: requestSnap.data()?.studentId });
  } catch (error) {
    console.error("Batch request claim failed", error);
    return NextResponse.json({ success: false, message: "Could not take this request." }, { status: 500 });
  }
}
