import { NextRequest, NextResponse } from "next/server";
import { FieldPath } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { identity, apiError } from "@/lib/platform/server";
export async function GET(request: NextRequest) {
  try {
    await identity(request,true);
    const kind = request.nextUrl.searchParams.get("kind") || "students";
    if (!["students","teachers"].includes(kind)) throw new Error("Invalid directory");
    let q = adminDb.collection(kind).orderBy(FieldPath.documentId()).limit(50);
    const cursor = request.nextUrl.searchParams.get("cursor");
    if (cursor) q = q.startAfter(cursor);
    const snapshot = await q.get();
    return NextResponse.json({ users:snapshot.docs.map((doc) => { const d = doc.data(); return {id:doc.id,name:d.name || d.displayName || "Unnamed",email:d.email || "",phone:d.phone || "",classNumber:d.classNumber || "",board:d.board || "",subjects:d.subjects || [],status:d.applicationStatus || d.status || "Active"}; }), next:snapshot.size === 50 ? snapshot.docs.at(-1)!.id : null }, {headers:{"Cache-Control":"private, no-store"}});
  } catch(e) { return apiError(e); }
}
