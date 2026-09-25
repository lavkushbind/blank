import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  let uid: string;
  try { uid = (await adminAuth.verifyIdToken(token)).uid; }
  catch { return NextResponse.json({ error: "Invalid sign-in" }, { status: 401 }); }
  try {
    const bookings = await adminDb.collection("demo_bookings").where("studentId", "==", uid).get();
    const teacherNames = new Map<string, Promise<string>>();
    const details = await Promise.all(bookings.docs.map(async (booking) => {
      const data = booking.data();
      const ids = [...new Set([data.sessionId, ...(Array.isArray(data.sessionIds) ? data.sessionIds : []), ...(Array.isArray(data.demoSessionIds) ? data.demoSessionIds : [])].filter((id): id is string => typeof id === "string" && !!id))];
      const snapshots = ids.length ? await adminDb.getAll(...ids.map((id) => adminDb.collection("class_sessions").doc(id))) : [];
      const linked = await adminDb.collection("class_sessions").where("demoBookingId", "==", booking.id).get();
      const sessions = [...new Map([...snapshots, ...linked.docs].filter((s) => s.exists).map((s) => [s.id, s])).values()].map((s) => {
        const value = s.data()!;
        return { id: s.id, teacherId: value.teacherId || null, teacherName: value.teacherName || null, date: value.date || null, startTime: value.startTime || null, endTime: value.endTime || null, status: value.status || "SCHEDULED", subject: value.subject || null, demoSessionIndex: value.demoSessionIndex ?? 0, endedAt: value.endedAt?.toDate?.().toISOString() || null };
      });
      const teacherId = data.teacherId || sessions.find((s) => s.teacherId)?.teacherId;
      if (teacherId && !teacherNames.has(teacherId)) teacherNames.set(teacherId, adminDb.collection("teachers").doc(teacherId).get().then((snapshot) => {
        const teacher = snapshot.data();
        return teacher?.name || teacher?.displayName || teacher?.fullName || "";
      }));
      return { id: booking.id, teacherName: data.teacherName || (teacherId ? await teacherNames.get(teacherId) : "") || sessions.find((s) => s.teacherName)?.teacherName || "", sessions };
    }));
    return NextResponse.json({ details }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Student demo details lookup failed", error);
    return NextResponse.json({ error: "Unable to load booking details" }, { status: 500 });
  }
}
