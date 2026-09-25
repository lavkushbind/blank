import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

async function authorize(request: NextRequest, studentId: string) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.cookies.get("__session")?.value;
  if (!token) throw new Error("UNAUTHORIZED");
  const user = await adminAuth.verifyIdToken(token);
  const [batch, session, demo, assignedRequest] = await Promise.all([
    adminDb.collection("batches").where("teacherId", "==", user.uid).where("studentIds", "array-contains", studentId).limit(1).get(),
    adminDb.collection("class_sessions").where("teacherId", "==", user.uid).where("studentIds", "array-contains", studentId).limit(1).get(),
    adminDb.collection("demo_bookings").where("teacherId", "==", user.uid).where("studentId", "==", studentId).limit(1).get(),
    adminDb.collection("batch_requests").where("teacherId", "==", user.uid).where("studentId", "==", studentId).limit(1).get(),
  ]);
  if (user.uid === studentId || (batch.empty && session.empty && demo.empty && assignedRequest.empty)) throw new Error("FORBIDDEN");
  return user;
}

export async function GET(request: NextRequest, context: { params: Promise<{ studentId: string }> }) {
  try {
    const { studentId } = await context.params;
    const teacher = await authorize(request, studentId);
    const chatId = `${teacher.uid}_${studentId}`;
    const [studentSnap, messagesSnap] = await Promise.all([
      adminDb.collection("students").doc(studentId).get(),
      adminDb.collection("teacher_student_chats").doc(chatId).collection("messages").orderBy("createdAt", "asc").limit(200).get(),
    ]);
    const student = studentSnap.data() || {};
    const messages = messagesSnap.docs.map((item) => {
      const data = item.data();
      return { id: item.id, text: data.text, senderId: data.senderId, createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null };
    });
    return NextResponse.json({ success: true, student: { id: studentId, name: student.name || student.displayName || "Student", email: student.email || null, grade: student.grade || student.class || student.classNumber || null }, messages });
  } catch (error) {
    const forbidden = error instanceof Error && error.message === "FORBIDDEN";
    return NextResponse.json({ success: false, message: forbidden ? "This student is not assigned to you." : "Sign in to open this conversation." }, { status: forbidden ? 403 : 401 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ studentId: string }> }) {
  try {
    const { studentId } = await context.params;
    const teacher = await authorize(request, studentId);
    const body = await request.json();
    const text = String(body.text || "").trim();
    if (!text || text.length > 2000) return NextResponse.json({ success: false, message: "Message must be 1–2000 characters." }, { status: 400 });
    const chat = adminDb.collection("teacher_student_chats").doc(`${teacher.uid}_${studentId}`);
    await chat.set({ teacherId: teacher.uid, studentId, updatedAt: FieldValue.serverTimestamp(), lastMessage: text }, { merge: true });
    const ref = await chat.collection("messages").add({ senderId: teacher.uid, text, createdAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, message: { id: ref.id, senderId: teacher.uid, text, createdAt: new Date().toISOString() } });
  } catch (error) {
    const forbidden = error instanceof Error && error.message === "FORBIDDEN";
    return NextResponse.json({ success: false, message: forbidden ? "This student is not assigned to you." : "Message could not be sent." }, { status: forbidden ? 403 : 401 });
  }
}
