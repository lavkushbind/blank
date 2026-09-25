import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebase/admin";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const sessionId = (await context.params).sessionId;
    const authorization = request.headers.get("authorization") || "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match?.[1]) return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(match[1]);
    const sessionRef = adminDb.collection("class_sessions").doc(sessionId);
    const sessionSnapshot = await sessionRef.get();
    if (!sessionSnapshot.exists) return NextResponse.json({ success: false, error: "SESSION_NOT_FOUND" }, { status: 404 });
    const session = sessionSnapshot.data() || {};
    if ((session.teacherId || session.teacherUid) !== decoded.uid) {
      return NextResponse.json({ success: false, error: "SESSION_ACCESS_DENIED" }, { status: 403 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.type !== "application/pdf") {
      return NextResponse.json({ success: false, error: "PDF_FILE_REQUIRED" }, { status: 400 });
    }
    if (file.size === 0 || file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "PDF_SIZE_LIMIT" }, { status: 413 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "lesson.pdf";
    const objectPath = `classroom-materials/${sessionId}/${Date.now()}-${safeName}`;
    const object = adminStorage.bucket().file(objectPath);
    await object.save(Buffer.from(await file.arrayBuffer()), {
      resumable: false,
      metadata: { contentType: "application/pdf", cacheControl: "private, max-age=14400" },
    });
    const [url] = await object.getSignedUrl({ action: "read", expires: Date.now() + 4 * 60 * 60 * 1000 });
    await sessionRef.update({ materials: FieldValue.arrayUnion({ name: file.name, objectPath, contentType: file.type, uploadedAt: new Date().toISOString(), uploadedBy: decoded.uid }) });
    return NextResponse.json({ success: true, document: { url, name: file.name } });
  } catch (error) {
    console.error("Classroom PDF upload failed:", error);
    return NextResponse.json({ success: false, error: "PDF_UPLOAD_FAILED" }, { status: 500 });
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const sessionId = (await context.params).sessionId;
    const authorization = request.headers.get("authorization") || "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match?.[1]) return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(match[1]);
    const snapshot = await adminDb.collection("class_sessions").doc(sessionId).get();
    if (!snapshot.exists) return NextResponse.json({ success: false, error: "SESSION_NOT_FOUND" }, { status: 404 });
    const session = snapshot.data() || {};
    const studentIds = Array.isArray(session.studentIds) ? session.studentIds : [];
    const teacherId = session.teacherId || session.teacherUid;
    if (decoded.uid !== teacherId && !studentIds.includes(decoded.uid)) return NextResponse.json({ success: false, error: "SESSION_ACCESS_DENIED" }, { status: 403 });
    const materials = await Promise.all((Array.isArray(session.materials) ? session.materials : []).map(async (item: any) => {
      if (!item?.objectPath) return null;
      try {
        const [url] = await adminStorage.bucket().file(item.objectPath).getSignedUrl({ action: "read", expires: Date.now() + 60 * 60 * 1000 });
        return { name: item.name || "Class material.pdf", url, uploadedAt: item.uploadedAt || null };
      } catch { return null; }
    }));
    return NextResponse.json({ success: true, materials: materials.filter(Boolean) });
  } catch (error) {
    console.error("Class materials read failed", error);
    return NextResponse.json({ success: false, error: "MATERIALS_LOAD_FAILED" }, { status: 500 });
  }
}
