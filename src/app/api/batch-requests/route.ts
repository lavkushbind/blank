import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

const programs: Record<string, { title: string; subjects: string[] }> = {
  MATH_ONLY: { title: "Math", subjects: ["Math"] },
  ENGLISH_ONLY: { title: "English", subjects: ["English"] },
  ALL_SUBJECTS: { title: "Math + Science + English", subjects: ["Math", "Science", "English"] },
};

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.cookies.get("__session")?.value;
    if (!token) return NextResponse.json({ success: false, message: "Please sign in first." }, { status: 401 });
    const user = await adminAuth.verifyIdToken(token);
    const body = await request.json();
    const program = programs[String(body.programId || "")];
    const classNumber = Number(body.classNumber);
    if (!program || !Number.isInteger(classNumber) || classNumber < 1 || classNumber > 12) {
      return NextResponse.json({ success: false, message: "Choose a subject and valid class." }, { status: 400 });
    }
    const studentSnap = await adminDb.collection("students").doc(user.uid).get();
    const student = studentSnap.data() || {};
    const ref = adminDb.collection("batch_requests").doc();
    await ref.set({
      studentId: user.uid,
      studentName: student.name || user.name || "Student",
      studentEmail: user.email || null,
      programId: body.programId,
      programName: program.title,
      subjects: program.subjects,
      classNumber,
      board: String(body.board || student.board || "CBSE").slice(0, 40),
      preferredTime: String(body.preferredTime || "Flexible").slice(0, 60),
      note: String(body.note || "").trim().slice(0, 500),
      status: "OPEN",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ success: true, requestId: ref.id });
  } catch (error) {
    console.error("Batch request failed", error);
    return NextResponse.json({ success: false, message: "Could not send your batch request." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.cookies.get("__session")?.value;
    if (!token) return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
    const user = await adminAuth.verifyIdToken(token);
    const teacherSnap = await adminDb.collection("teachers").doc(user.uid).get();
    if (!teacherSnap.exists) return NextResponse.json({ success: false, message: "Teacher profile required." }, { status: 403 });
    const teacher = teacherSnap.data() || {};
    if (teacher.applicationStatus !== "APPROVED") return NextResponse.json({ success: false, message: "Your teacher profile must be approved before reviewing requests." }, { status: 403 });
    const subjectKey = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "").replace(/^mathematics$/, "math").replace(/^maths$/, "math");
    const subjects = new Set((Array.isArray(teacher.subjects) ? teacher.subjects : []).map((item: string) => subjectKey(String(item))));
    const grades = new Set((Array.isArray(teacher.grades) ? teacher.grades : Array.isArray(teacher.classesTaught) ? teacher.classesTaught : []).map((item: string) => String(item).replace(/[^0-9]/g, "")));
    const snapshot = await adminDb.collection("batch_requests").where("status", "==", "OPEN").limit(100).get();
    const rows = snapshot.docs.filter((item) => {
      const data = item.data();
      const requestedSubjects = (data.subjects || []).map((value: string) => subjectKey(String(value)));
      const grade = String(data.classNumber || "");
      const teachesClass = grades.size === 0 || grades.has(grade);
      return teachesClass && requestedSubjects.length > 0 && requestedSubjects.every((subject: string) => subjects.has(subject));
    }).map((item) => ({ id: item.id, ...item.data(), createdAt: item.data().createdAt?.toDate?.()?.toISOString?.() || null }));
    return NextResponse.json({ success: true, requests: rows });
  } catch (error) {
    console.error("Batch request queue failed", error);
    return NextResponse.json({ success: false, message: "Could not load matching batch requests." }, { status: 500 });
  }
}
