import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.cookies.get("__session")?.value;
    if (!token) return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
    const user = await adminAuth.verifyIdToken(token);
    const snapshot = await adminDb.collection("batches").where("studentIds", "array-contains", user.uid).limit(50).get();
    const batches = snapshot.docs.map((item) => {
      const data = item.data();
      return { id: item.id, name: data.name || data.title || "Learning batch", subject: data.subject || "", subjects: Array.isArray(data.subjects) ? data.subjects : [], teacherId: data.teacherId || data.teacherUid || null, status: data.status || "ACTIVE" };
    }).filter((item) => !["ENDED", "CANCELLED", "ARCHIVED"].includes(String(item.status).toUpperCase()));
    return NextResponse.json({ success: true, batches });
  } catch (error) {
    console.error("Student batch lookup failed", error);
    return NextResponse.json({ success: false, message: "Your batches could not be loaded." }, { status: 500 });
  }
}
