import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

type Context = { params: Promise<{ sessionId: string }> };

async function access(request: NextRequest, sessionId: string) {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) throw new Error("UNAUTHORIZED");
  let user;
  try { user = await adminAuth.verifyIdToken(bearer); } catch { throw new Error("UNAUTHORIZED"); }
  const sessionRef = adminDb.collection("class_sessions").doc(sessionId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) throw new Error("NOT_FOUND");
  const session = sessionSnap.data()!;
  const [userSnap, teacherSnap, studentSnap] = await Promise.all([
    adminDb.collection("users").doc(user.uid).get(),
    adminDb.collection("teachers").doc(user.uid).get(),
    adminDb.collection("students").doc(user.uid).get(),
  ]);
  const role = String(userSnap.data()?.role || (teacherSnap.exists ? "TEACHER" : studentSnap.exists ? "STUDENT" : "")).toUpperCase();
  const teacherId = session.teacherId || session.teacherUid;
  const studentIds = Array.isArray(session.studentIds) ? session.studentIds : Array.isArray(session.students) ? session.students.map((value: any) => typeof value === "string" ? value : value?.studentId || value?.uid).filter(Boolean) : [];
  const isTeacher = role === "TEACHER" && teacherSnap.exists && teacherId === user.uid;
  const isAdmin = role === "ADMIN";
  let isStudent = role === "STUDENT" && studentSnap.exists && studentIds.includes(user.uid);
  if (role === "STUDENT" && studentSnap.exists && !isStudent && session.batchId) {
    const [batchSnapshot, studentEnrollment, userEnrollment] = await Promise.all([
      adminDb.collection("batches").doc(String(session.batchId)).get(),
      adminDb.collection("enrollments").where("batchId", "==", String(session.batchId)).where("studentId", "==", user.uid).limit(1).get(),
      adminDb.collection("enrollments").where("batchId", "==", String(session.batchId)).where("userId", "==", user.uid).limit(1).get(),
    ]);
    const enrollmentIsActive = (snapshot: typeof studentEnrollment) => snapshot.docs.some((item) => {
      const status = String(item.data().membershipStatus || item.data().status || "").toUpperCase();
      return !status || ["TRIAL", "ACTIVE", "ENROLLED"].includes(status);
    });
    isStudent = Array.isArray(batchSnapshot.data()?.studentIds) && batchSnapshot.data()?.studentIds.includes(user.uid)
      || enrollmentIsActive(studentEnrollment)
      || enrollmentIsActive(userEnrollment);
  }
  if (!isTeacher && !isAdmin && !isStudent) throw new Error("FORBIDDEN");
  return { uid: user.uid, role: isAdmin ? "ADMIN" : isTeacher ? "TEACHER" : "STUDENT", sessionRef, session };
}

function failure(error: unknown) {
  const status = error instanceof Error && error.message === "NOT_FOUND" ? 404 : error instanceof Error && error.message === "FORBIDDEN" ? 403 : error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;
  return NextResponse.json({ success: false, message: status === 404 ? "Class session not found." : status === 403 ? "You are not a participant in this class." : status === 401 ? "Sign in to use class polls." : "Poll request failed." }, { status });
}

async function publicPoll(session: FirebaseFirestore.DocumentData, uid: string) {
  const pollId = session.activePollId || session.lastPollId;
  if (!pollId) return null;
  const snap = await adminDb.collection("class_sessions").doc(session.id).collection("polls").doc(String(pollId)).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  const votes = data.votes && typeof data.votes === "object" ? data.votes as Record<string, number> : {};
  const counts = data.options.map((_: string, index: number) => Object.values(votes).filter((choice) => choice === index).length);
  return { id: snap.id, question: data.question, options: data.options, counts, totalVotes: Object.keys(votes).length, myVote: Number.isInteger(votes[uid]) ? votes[uid] : null, status: data.status, createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null };
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const { sessionId } = await context.params;
    const participant = await access(request, sessionId);
    return NextResponse.json({ success: true, poll: await publicPoll({ ...participant.session, id: sessionId }, participant.uid), role: participant.role });
  } catch (error) { return failure(error); }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const { sessionId } = await context.params;
    const participant = await access(request, sessionId);
    let body: { action?: string; question?: string; options?: unknown[]; pollId?: string; optionIndex?: number };
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, message: "Invalid poll request." }, { status: 400 }); }
    const pollsRef = participant.sessionRef.collection("polls");

    if (body.action === "launch") {
      if (participant.role !== "TEACHER" && participant.role !== "ADMIN") return NextResponse.json({ success: false, message: "Only the teacher can launch a poll." }, { status: 403 });
      const question = String(body.question || "").trim();
      const options = Array.isArray(body.options) ? body.options.map((value) => String(value).trim()).filter(Boolean) : [];
      if (question.length < 3 || question.length > 500 || options.length < 2 || options.length > 6 || options.some((option) => option.length > 200)) return NextResponse.json({ success: false, message: "Add a question and between 2 and 6 options." }, { status: 400 });
      const pollRef = pollsRef.doc();
      await adminDb.runTransaction(async (transaction) => {
        const sessionSnap = await transaction.get(participant.sessionRef);
        const activeId = sessionSnap.data()?.activePollId;
        if (activeId) {
          const activeRef = pollsRef.doc(String(activeId));
          const activeSnap = await transaction.get(activeRef);
          if (activeSnap.exists && activeSnap.data()?.status === "ACTIVE") throw new Error("POLL_ALREADY_ACTIVE");
        }
        transaction.create(pollRef, { question, options, votes: {}, status: "ACTIVE", createdBy: participant.uid, createdAt: FieldValue.serverTimestamp() });
        transaction.update(participant.sessionRef, { activePollId: pollRef.id, lastPollId: pollRef.id, updatedAt: FieldValue.serverTimestamp() });
      });
      return NextResponse.json({ success: true, poll: await publicPoll({ ...participant.session, id: sessionId, activePollId: pollRef.id }, participant.uid) }, { status: 201 });
    }

    if (body.action === "vote") {
      if (participant.role !== "STUDENT") return NextResponse.json({ success: false, message: "Only students can vote." }, { status: 403 });
      if (!Number.isInteger(body.optionIndex) || Number(body.optionIndex) < 0) return NextResponse.json({ success: false, message: "Choose a valid option." }, { status: 400 });
      const outcome: { value: "OK" | "CLOSED" | "ALREADY_VOTED" | "INVALID_OPTION" } = { value: "OK" };
      await adminDb.runTransaction(async (transaction) => {
        const sessionSnap = await transaction.get(participant.sessionRef);
        const pollId = String(sessionSnap.data()?.activePollId || "");
        if (!pollId || (body.pollId && body.pollId !== pollId)) { outcome.value = "CLOSED"; return; }
        const pollRef = pollsRef.doc(pollId);
        const pollSnap = await transaction.get(pollRef);
        if (!pollSnap.exists || pollSnap.data()?.status !== "ACTIVE") { outcome.value = "CLOSED"; return; }
        const poll = pollSnap.data()!;
        if (Number(body.optionIndex) >= poll.options.length) { outcome.value = "INVALID_OPTION"; return; }
        const votes = poll.votes && typeof poll.votes === "object" ? poll.votes : {};
        if (Object.prototype.hasOwnProperty.call(votes, participant.uid)) { outcome.value = "ALREADY_VOTED"; return; }
        transaction.update(pollRef, { [`votes.${participant.uid}`]: Number(body.optionIndex), updatedAt: FieldValue.serverTimestamp() });
      });
      if (outcome.value !== "OK" && outcome.value !== "ALREADY_VOTED") return NextResponse.json({ success: false, message: outcome.value === "CLOSED" ? "This poll is closed." : "Choose a valid option." }, { status: outcome.value === "CLOSED" ? 409 : 400 });
      const latestSession = (await participant.sessionRef.get()).data()!;
      return NextResponse.json({ success: true, alreadyVoted: outcome.value === "ALREADY_VOTED", poll: await publicPoll({ ...latestSession, id: sessionId }, participant.uid) });
    }

    if (body.action === "close") {
      if (participant.role !== "TEACHER" && participant.role !== "ADMIN") return NextResponse.json({ success: false, message: "Only the teacher can close a poll." }, { status: 403 });
      await adminDb.runTransaction(async (transaction) => {
        const sessionSnap = await transaction.get(participant.sessionRef);
        const pollId = String(sessionSnap.data()?.activePollId || "");
        if (!pollId || (body.pollId && body.pollId !== pollId)) return;
        const pollRef = pollsRef.doc(pollId);
        const pollSnap = await transaction.get(pollRef);
        if (pollSnap.exists && pollSnap.data()?.status === "ACTIVE") transaction.update(pollRef, { status: "CLOSED", closedAt: FieldValue.serverTimestamp() });
        transaction.update(participant.sessionRef, { activePollId: FieldValue.delete(), lastPollId: pollId, updatedAt: FieldValue.serverTimestamp() });
      });
      const latestSession = (await participant.sessionRef.get()).data()!;
      return NextResponse.json({ success: true, poll: await publicPoll({ ...latestSession, id: sessionId }, participant.uid) });
    }
    return NextResponse.json({ success: false, message: "Unknown poll action." }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === "POLL_ALREADY_ACTIVE") return NextResponse.json({ success: false, message: "Close the current poll before starting another." }, { status: 409 });
    return failure(error);
  }
}
