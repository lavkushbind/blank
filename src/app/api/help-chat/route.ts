import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { identity, apiError } from "@/lib/platform/server";
export async function GET(request: NextRequest) {
  try {
    const user = await identity(request);
    const requested = request.nextUrl.searchParams.get("uid");
    if (requested && requested !== user.uid && user.admin !== true) throw new Error("FORBIDDEN");
    if (request.nextUrl.searchParams.get("inbox") === "true") {
      if (user.admin !== true) throw new Error("FORBIDDEN");
      let query = adminDb.collection("help_threads").orderBy("updatedAt", "desc").limit(50);
      const before = Number(request.nextUrl.searchParams.get("before"));
      if (before) query = query.startAfter(before);
      const rows = await query.get();
      return NextResponse.json({threads:rows.docs.map((d) => ({...d.data(),id:d.id})),next:rows.size === 50 ? rows.docs.at(-1)!.data().updatedAt : null});
    }
    let query = adminDb.collection("help_threads").doc(requested || user.uid).collection("messages").orderBy("at","desc").limit(100);
    const before = Number(request.nextUrl.searchParams.get("before"));
    if (before) query = query.startAfter(before);
    const rows = await query.get();
    return NextResponse.json({messages:rows.docs.map((d) => ({...d.data(),id:d.id})).reverse(),next:rows.size === 100 ? rows.docs.at(-1)!.data().at : null}, {headers:{"Cache-Control":"private, no-store"}});
  } catch(e) { return apiError(e); }
}
export async function POST(request: NextRequest) {
  try {
    const user = await identity(request);
    const body = await request.json();
    if (typeof body.text !== "string" || !body.text.trim() || body.text.length > 2000 || typeof body.requestId !== "string" || !/^[a-zA-Z0-9-]{8,80}$/.test(body.requestId)) throw new Error("Invalid message");
    const target = typeof body.uid === "string" ? body.uid : user.uid;
    if (target !== user.uid && user.admin !== true) throw new Error("FORBIDDEN");
    const profile = await adminDb.collection("users").doc(user.uid).get();
    const teacher = await adminDb.collection("teachers").doc(user.uid).get();
    const isAdmin = user.admin === true;
    const ref = adminDb.collection("help_threads").doc(target);
    const messageRef = ref.collection("messages").doc(body.requestId);
    await adminDb.runTransaction(async (tx) => {
      const [thread, existing] = await Promise.all([tx.get(ref), tx.get(messageRef)]);
      if (existing.exists) return;
      if (target !== user.uid && !thread.exists) throw new Error("Invalid support thread");
      const now = Date.now();
      if (!isAdmin && now - (thread.data()?.lastUserAt || 0) < 2000) throw new Error("RATE_LIMIT");
      tx.set(messageRef,{text:body.text.trim(),sender:isAdmin ? "admin" : "user",at:now});
      tx.set(ref,{...(!thread.exists ? {name:profile.data()?.name || user.name || "Learner", email:user.email || "", role:teacher.exists ? "TEACHER" : "STUDENT"} : {}),updatedAt:now,lastMessage:body.text.trim().slice(0,120),status:isAdmin ? "REPLIED" : "WAITING",...(!isAdmin ? {lastUserAt:now} : {})},{merge:true});
    });
    return NextResponse.json({success:true});
  } catch(e) { return apiError(e); }
}
