import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebase/admin";

async function currentUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.cookies.get("__session")?.value;
  if (!token) throw new Error("UNAUTHENTICATED");
  return adminAuth.verifyIdToken(token);
}

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser(request);
    const teacher = await adminDb.collection("teachers").doc(user.uid).get();
    const isTeacher = teacher.exists;
    const snapshot = await adminDb.collection("submissions").where(isTeacher ? "teacherId" : "studentId", "==", user.uid).limit(100).get();
    const rows = await Promise.all(snapshot.docs.map(async (item) => {
      const data = item.data();
      let attachmentUrl: string | null = null;
      if (data.attachmentPath) {
        try { [attachmentUrl] = await adminStorage.bucket().file(data.attachmentPath).getSignedUrl({ action: "read", expires: Date.now() + 60 * 60 * 1000 }); } catch { attachmentUrl = null; }
      }
      return { id: item.id, ...data, submittedAt: data.submittedAt?.toDate?.()?.toISOString?.() || null, attachmentUrl };
    }));
    rows.sort((a, b) => String(b.submittedAt || "").localeCompare(String(a.submittedAt || "")));
    return NextResponse.json({ success: true, submissions: rows, role: isTeacher ? "TEACHER" : "STUDENT" });
  } catch (error) {
    const unauthenticated = error instanceof Error && error.message === "UNAUTHENTICATED";
    return NextResponse.json({ success: false, message: unauthenticated ? "Sign in required." : "Homework could not be loaded." }, { status: unauthenticated ? 401 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser(request);
    const studentSnap = await adminDb.collection("students").doc(user.uid).get();
    if (!studentSnap.exists) return NextResponse.json({ success: false, message: "Complete your student profile before submitting homework." }, { status: 403 });
    const form = await request.formData();
    const batchId = String(form.get("batchId") || "");
    const taskTitle = String(form.get("taskTitle") || "").trim().slice(0, 160);
    const contentNotes = String(form.get("contentNotes") || "").trim().slice(0, 5000);
    const file = form.get("file");
    if (!batchId || !taskTitle || (!contentNotes && !(file instanceof File))) return NextResponse.json({ success: false, message: "Choose a class, enter a title, and add written work or a file." }, { status: 400 });
    const batchRef = adminDb.collection("batches").doc(batchId);
    const batchSnap = await batchRef.get();
    const batch = batchSnap.data();
    const studentIds = Array.isArray(batch?.studentIds) ? batch.studentIds : [];
    if (!batchSnap.exists || !studentIds.includes(user.uid)) return NextResponse.json({ success: false, message: "This batch is not assigned to your account." }, { status: 403 });
    const teacherId = String(batch?.teacherId || batch?.teacherUid || "");
    if (!teacherId) return NextResponse.json({ success: false, message: "Your batch does not have an assigned teacher yet." }, { status: 409 });

    let attachmentPath: string | null = null;
    let attachmentName: string | null = null;
    if (file instanceof File) {
      const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(file.type) || file.size < 1 || file.size > 15 * 1024 * 1024) return NextResponse.json({ success: false, message: "Attach a PDF or image up to 15 MB." }, { status: 400 });
      attachmentName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "homework-file";
      attachmentPath = `homework-submissions/${user.uid}/${Date.now()}-${attachmentName}`;
      await adminStorage.bucket().file(attachmentPath).save(Buffer.from(await file.arrayBuffer()), { resumable: false, metadata: { contentType: file.type, cacheControl: "private, max-age=3600" } });
    }
    const ref = adminDb.collection("submissions").doc();
    await ref.set({ studentId: user.uid, studentName: studentSnap.data()?.name || user.name || "Student", teacherId, batchId, batchName: batch?.name || batch?.title || "Class batch", taskTitle, contentNotes, attachmentPath, attachmentName, status: "PENDING", submittedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, submissionId: ref.id });
  } catch (error) {
    console.error("Homework submission failed", error);
    const unauthenticated = error instanceof Error && error.message === "UNAUTHENTICATED";
    return NextResponse.json({ success: false, message: unauthenticated ? "Sign in required." : "Homework could not be submitted." }, { status: unauthenticated ? 401 : 500 });
  }
}
