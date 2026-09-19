"use client";

import React, { useEffect, useState, use } from "react";
import { LiveKitClassroom } from "@/components/classroom/LiveKitClassroom";
import { initializeRoomState } from "@/lib/firebase/classroomSync";

export default function TeacherStudioPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const [token, setToken] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    // Non-blocking Firestore initialization in background
    initializeRoomState(sessionId, true, "Rahul Sharma Sir").catch(() => {});

    // Fast Token Fetch
    async function fetchToken() {
      try {
        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomName: sessionId,
            participantIdentity: `teacher_${Date.now()}`,
            participantName: "Rahul Sharma Sir",
            role: "teacher",
          }),
        });
        const data = await res.json();
        if (data.token) {
          setToken(data.token);
        } else {
          setErrorMsg(data.error || "Token acquisition failed");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Network error fetching token");
      }
    }
    fetchToken();
  }, [sessionId]);

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-red-200 p-6 rounded-3xl max-w-sm w-full text-center space-y-2 shadow-xl">
          <p className="text-sm font-black text-red-600">Connection Notice</p>
          <p className="text-xs text-slate-500">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-600">Connecting to Rahul Sir's Studio...</p>
      </div>
    );
  }

  return (
    <LiveKitClassroom
      token={token}
      sessionId={sessionId}
      role="teacher"
      participantName="Rahul Sharma Sir"
    />
  );
}