import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

const CATALOG = [
  { id: "math-titan", title: "Math Titan", description: "A badge for your learning profile.", cost: 300 },
  { id: "seven-day-flame", title: "7-Day Flame", description: "A badge for your learning profile.", cost: 200 },
  { id: "speed-solver", title: "Speed Solver", description: "A badge for your learning profile.", cost: 500 },
  { id: "stem-wizard", title: "STEM Wizard", description: "A badge for your learning profile.", cost: 600 },
];

async function getStudent(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.cookies.get("__session")?.value;
  if (!token) throw new Error("UNAUTHORIZED");
  const user = await adminAuth.verifyIdToken(token);
  const profile = await adminDb.collection("students").doc(user.uid).get();
  if (!profile.exists) throw new Error("STUDENT_PROFILE_REQUIRED");
  return { uid: user.uid, ref: profile.ref, data: profile.data() || {} };
}

export async function GET(request: NextRequest) {
  try {
    const student = await getStudent(request);
    const unlocked = Array.isArray(student.data.unlockedBadges) ? student.data.unlockedBadges : [];
    return NextResponse.json({ success: true, coins: Number(student.data.coins) || 0, badges: CATALOG.map((badge) => ({ ...badge, unlocked: unlocked.includes(badge.id) })) });
  } catch (error) {
    const missingProfile = error instanceof Error && error.message === "STUDENT_PROFILE_REQUIRED";
    return NextResponse.json({ success: false, message: missingProfile ? "Student profile not found." : "Sign in to load your badges." }, { status: missingProfile ? 404 : 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const student = await getStudent(request);
    const { badgeId } = await request.json();
    const badge = CATALOG.find((item) => item.id === badgeId);
    if (!badge) return NextResponse.json({ success: false, message: "Choose a valid badge." }, { status: 400 });
    const result = await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(student.ref);
      if (!snapshot.exists) throw new Error("STUDENT_PROFILE_REQUIRED");
      const data = snapshot.data() || {};
      const unlocked: string[] = Array.isArray(data.unlockedBadges) ? data.unlockedBadges : [];
      const coins = Number(data.coins) || 0;
      if (unlocked.includes(badge.id)) return { coins, alreadyUnlocked: true };
      if (coins < badge.cost) throw new Error("NOT_ENOUGH_COINS");
      transaction.update(student.ref, { coins: coins - badge.cost, unlockedBadges: [...unlocked, badge.id] });
      return { coins: coins - badge.cost, alreadyUnlocked: false };
    });
    return NextResponse.json({ success: true, coins: result.coins, badgeId: badge.id, alreadyUnlocked: result.alreadyUnlocked });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "NOT_ENOUGH_COINS") return NextResponse.json({ success: false, message: "You do not have enough coins for this badge." }, { status: 409 });
    if (message === "STUDENT_PROFILE_REQUIRED") return NextResponse.json({ success: false, message: "Student profile not found." }, { status: 404 });
    return NextResponse.json({ success: false, message: "Sign in to unlock a badge." }, { status: 401 });
  }
}
