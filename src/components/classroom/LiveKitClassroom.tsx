"use client";

import React, { useState, useEffect } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { ClassroomStage } from "@/components/classroom/ClassroomStage";
import Link from "next/link";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Share2, Users, Radio } from "lucide-react";

export function LiveKitClassroom({
  token,
  sessionId,
  role,
  participantName,
}: {
  token: string;
  sessionId: string;
  role: "teacher" | "student";
  participantName: string;
}) {
  const isTeacher = role === "teacher";
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState(1938);

  useEffect(() => {
    const t = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://blank-6hk49601.livekit.cloud";

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#090D16] flex flex-col overflow-hidden select-none z-50">
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect={true}
        video={camOn}
        audio={micOn}
        className="h-full w-full flex flex-col overflow-hidden"
      >
        <RoomAudioRenderer />

        {/* 1. APPLE / LINEAR STYLE ULTRA-CLEAN TOP FLOATING BAR */}
        <header className="h-14 bg-[#0B0F19]/90 backdrop-blur-xl border-b border-white/10 px-6 flex items-center justify-between text-white shrink-0 z-30">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="font-bold text-xs tracking-wide text-white">Class 8 • Mathematics</span>
            </div>
            <span className="text-slate-600">/</span>
            <span className="text-xs text-slate-400 font-medium">Linear Equations in One Variable</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs font-mono font-medium text-slate-300">
              <Radio size={12} className="text-emerald-400 animate-pulse" />
              <span>LIVE • {formatTime(timerSeconds)}</span>
            </div>

            {isTeacher ? (
              <Link
                href={`/post-class/${sessionId}`}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5"
              >
                <PhoneOff size={13} /> End Class
              </Link>
            ) : (
              <Link
                href="/hub"
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5"
              >
                <PhoneOff size={13} /> Leave Pod
              </Link>
            )}
          </div>
        </header>

        {/* 2. MAIN TEACHING CANVAS STAGE */}
        <ClassroomStage sessionId={sessionId} isTeacher={isTeacher} participantName={participantName} />

        {/* 3. APPLE FACETIME STYLE FLOATING DOCK */}
        <footer className="h-16 bg-[#0B0F19]/90 backdrop-blur-xl border-t border-white/10 px-6 flex items-center justify-center gap-3 text-white shrink-0 z-30">
          <button
            onClick={() => setMicOn(!micOn)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold transition ${
              micOn ? "bg-white/10 text-white hover:bg-white/20 border border-white/10" : "bg-red-600 text-white"
            }`}
          >
            {micOn ? <Mic size={15} /> : <MicOff size={15} />}
            <span>{micOn ? "Mute" : "Unmute"}</span>
          </button>

          <button
            onClick={() => setCamOn(!camOn)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold transition ${
              camOn ? "bg-white/10 text-white hover:bg-white/20 border border-white/10" : "bg-red-600 text-white"
            }`}
          >
            {camOn ? <Video size={15} /> : <VideoOff size={15} />}
            <span>{camOn ? "Stop Cam" : "Start Cam"}</span>
          </button>

          <button
            onClick={() => alert("Screen share initiated.")}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-2xl text-xs font-semibold transition"
          >
            <Share2 size={15} />
            <span>Share</span>
          </button>
        </footer>
      </LiveKitRoom>
    </div>
  );
}