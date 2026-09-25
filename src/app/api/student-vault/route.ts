import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebase/admin";

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.cookies.get("__session")?.value;
    if (!token) return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
    const user = await adminAuth.verifyIdToken(token);
    const sessions = await adminDb.collection("class_sessions").where("studentIds", "array-contains", user.uid).limit(100).get();
    const resources = await Promise.all(sessions.docs.map(async (item) => {
      const session = item.data();
      const postClass = await adminDb.collection("post_class").doc(item.id).get();
      const post = postClass.data() || {};
      const materials = await Promise.all((Array.isArray(session.materials) ? session.materials : []).map(async (material: any) => {
        if (!material?.objectPath) return null;
        try { const [url] = await adminStorage.bucket().file(material.objectPath).getSignedUrl({ action: "read", expires: Date.now() + 60 * 60 * 1000 }); return { name: material.name || "Class material", url }; } catch { return null; }
      }));
      return { id: item.id, title: session.title || "Live class", subject: session.subject || "Class materials", status: session.status || "SCHEDULED", date: session.date || null, startTime: session.startTime || null, summary: post.summary || "", attendance: typeof post.attendance?.[user.uid] === "boolean" ? (post.attendance[user.uid] ? "Present" : "Absent") : null, materials: materials.filter(Boolean) };
    }));
    resources.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    return NextResponse.json({ success: true, resources });
  } catch (error) {
    console.error("Student resources load failed", error);
    return NextResponse.json({ success: false, message: "Class resources could not be loaded." }, { status: 500 });
  }
}
