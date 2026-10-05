import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { createLiveKitToken } from "@/lib/livekit/server";
import { studentAccess } from "@/lib/classroom/studentAccess";

async function issue(req: NextRequest, sessionId: string) {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!bearer) return NextResponse.json({ success: false, error: "Sign in required" }, { status: 401 });
  let uid: string;
  try { uid = (await adminAuth.verifyIdToken(bearer)).uid; }
  catch { return NextResponse.json({ success: false, error: "Invalid sign-in" }, { status: 401 }); }
  if (!sessionId || sessionId.includes("/")) return NextResponse.json({ success: false, error: "Session required" }, { status: 400 });
  const snap = await adminDb.collection("class_sessions").doc(sessionId).get();
  if (!snap.exists) return NextResponse.json({ success: false, error: "Class not found" }, { status: 404 });
  const session = snap.data()!;
  const teacher = (session.teacherId || session.teacherUid) === uid;
  if (!teacher) {
    const student = (await adminDb.collection("students").doc(uid).get()).data();
    const enrollment = session.batchId ? (await adminDb.collection("enrollments").doc(session.batchId + "_" + uid).get()).data() : undefined;
    const memberStatus = String(enrollment?.membershipStatus || enrollment?.status || "").toUpperCase();
    const expires = enrollment?.expiresAt?.toDate?.().getTime();
    let eligible = ["ACTIVE", "ENROLLED"].includes(memberStatus) && (!expires || expires > Date.now()) && student?.subscriptionStatus !== "EXPIRED" && student?.subscriptionStatus !== "CANCELLED";
    if (memberStatus === "TRIAL" && enrollment?.bookingId) {
      const booking = (await adminDb.collection("demo_bookings").doc(enrollment.bookingId).get()).data();
      const ids = booking?.sessionIds || [booking?.sessionId];
      eligible = booking?.studentId === uid && booking?.batchId === session.batchId && ids.includes(sessionId) && booking?.status !== "CANCELLED" && booking?.demoStatus !== "COMPLETED" && ["PAID", "NOT_REQUIRED"].includes(booking?.paymentStatus);
    }
    if (!eligible || !studentAccess(session).allowed) return NextResponse.json({ success: false, error: eligible ? studentAccess(session).reason : "An allocated demo or active subscription is required." }, { status: 403 });
  }
  const user = (await adminDb.collection("users").doc(uid).get()).data();
  const roomName = session.livekitRoomName || session.liveRoomId || "blanklearn_" + sessionId;
  const role = teacher ? "teacher" : "student";
  const token = await createLiveKitToken({ roomName, participantIdentity: uid, participantName: user?.name || role, role });
  return NextResponse.json({ success: true, token, roomName, serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL, role: role.toUpperCase() }, { headers: { "Cache-Control": "no-store" } });
}
export async function GET(req: NextRequest) { try { return await issue(req, req.nextUrl.searchParams.get("sessionId") || ""); } catch { return NextResponse.json({ success: false, error: "Unable to open classroom" }, { status: 500 }); } }
export async function POST(req: NextRequest) { try { return await issue(req, String((await req.json()).sessionId || "")); } catch { return NextResponse.json({ success: false, error: "Unable to open classroom" }, { status: 500 }); } }
