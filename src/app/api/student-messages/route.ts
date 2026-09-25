import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.cookies.get("__session")?.value;
    if (!token) return NextResponse.json({ success: false, message: "Sign in to view messages." }, { status: 401 });
    const user = await adminAuth.verifyIdToken(token);
    const chats = await adminDb.collection("teacher_student_chats").where("studentId", "==", user.uid).limit(50).get();
    const conversations = await Promise.all(chats.docs.map(async (chat) => {
      const data = chat.data();
      const [teacherSnap, messages] = await Promise.all([
        adminDb.collection("teachers").doc(data.teacherId).get(),
        chat.ref.collection("messages").orderBy("createdAt", "desc").limit(50).get(),
      ]);
      return {
        teacherName: teacherSnap.data()?.name || "Your teacher",
        messages: messages.docs.reverse().map((item) => {
          const message = item.data();
          return { id: item.id, text: message.text, senderId: message.senderId, createdAt: message.createdAt?.toDate?.()?.toISOString?.() || null };
        }),
      };
    }));
    return NextResponse.json({ success: true, conversations });
  } catch (error) {
    console.error("Student message load failed", error);
    return NextResponse.json({ success: false, message: "Messages could not be loaded." }, { status: 500 });
  }
}
