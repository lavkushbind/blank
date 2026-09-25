import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

const QUIZ_ID = "daily-math";
const QUESTIONS = [
  { id: 1, text: "What is the solution of the linear equation: 3x - 5 = 16?", options: ["x = 5", "x = 7", "x = 6", "x = 9"], correct: 1 },
  { id: 2, text: "Which property allows us to write 2(x + 3) as 2x + 6?", options: ["Commutative", "Associative", "Distributive", "Closure"], correct: 2 },
  { id: 3, text: "If the perimeter of a square is 36 cm, what is its side length?", options: ["6 cm", "9 cm", "12 cm", "18 cm"], correct: 1 },
];
const dailyKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

async function studentFrom(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.cookies.get("__session")?.value;
  if (!token) throw new Error("UNAUTHORIZED");
  let user;
  try { user = await adminAuth.verifyIdToken(token); }
  catch { throw new Error("UNAUTHORIZED"); }
  const ref = adminDb.collection("students").doc(user.uid);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("STUDENT_PROFILE_REQUIRED");
  return { ref, uid: user.uid };
}

function authError(error: unknown) {
  const missing = error instanceof Error && error.message === "STUDENT_PROFILE_REQUIRED";
  return NextResponse.json({ success: false, message: missing ? "Student profile not found." : "Sign in with a student account." }, { status: missing ? 404 : 401 });
}

export async function GET(request: NextRequest) {
  try {
    const { ref } = await studentFrom(request);
    const attempt = await ref.collection("quiz_attempts").doc(`${QUIZ_ID}_${dailyKey()}`).get();
    return NextResponse.json({ success: true, quizId: QUIZ_ID, questions: QUESTIONS.map(({ correct: _correct, ...question }) => question), completed: attempt.exists, result: attempt.exists ? attempt.data() : null });
  } catch (error) { return authError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const { ref } = await studentFrom(request);
    let body: { quizId?: string; answers?: unknown[] };
    try { body = await request.json(); }
    catch { return NextResponse.json({ success: false, message: "Invalid quiz submission." }, { status: 400 }); }
    if (body.quizId !== QUIZ_ID || !Array.isArray(body.answers) || body.answers.length !== QUESTIONS.length || body.answers.some((answer: unknown) => !Number.isInteger(answer) || Number(answer) < 0 || Number(answer) > 3)) {
      return NextResponse.json({ success: false, message: "Submit one valid answer for each quiz question." }, { status: 400 });
    }
    const answers = body.answers;
    const correctCount = QUESTIONS.reduce((sum, question, index) => sum + (answers[index] === question.correct ? 1 : 0), 0);
    const award = correctCount * 50;
    const key = dailyKey();
    const attemptRef = ref.collection("quiz_attempts").doc(`${QUIZ_ID}_${key}`);
    const result = await adminDb.runTransaction(async (transaction) => {
      const [attemptSnap, studentSnap] = await Promise.all([transaction.get(attemptRef), transaction.get(ref)]);
      if (!studentSnap.exists) throw new Error("STUDENT_PROFILE_REQUIRED");
      const coins = Number(studentSnap.data()?.coins) || 0;
      if (attemptSnap.exists) return { completed: true, coinsAwarded: Number(attemptSnap.data()?.coinsAwarded) || 0, coinBalance: coins };
      const coinBalance = coins + award;
      transaction.create(attemptRef, { quizId: QUIZ_ID, date: key, correctCount, coinsAwarded: award, answers, completedAt: new Date() });
      transaction.update(ref, { coins: coinBalance });
      return { completed: false, coinsAwarded: award, coinBalance };
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof Error && ["STUDENT_PROFILE_REQUIRED", "UNAUTHORIZED"].includes(error.message)) return authError(error);
    console.error("Student quiz submission failed", error);
    return NextResponse.json({ success: false, message: "Quiz result could not be saved." }, { status: 500 });
  }
}
