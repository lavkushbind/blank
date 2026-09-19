"use client";

import React, { useEffect, useRef, useState } from "react";
import { Participant, Track } from "livekit-client";
import { Mic, MicOff, User } from "lucide-react";

// Sub-component for REAL joined participants (Only runs when participant exists)
function ActiveParticipantTile({
  participant,
  isSpotlight = false,
}: {
  participant: Participant;
  isSpotlight?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(participant.isSpeaking);
  const [micEnabled, setMicEnabled] = useState(participant.isMicrophoneEnabled);
  const [camEnabled, setCamEnabled] = useState(participant.isCameraEnabled);

  useEffect(() => {
    // 1. Attach native WebRTC Camera Track
    const cameraPub = participant.getTrackPublication(Track.Source.Camera);
    if (cameraPub && cameraPub.track && videoRef.current) {
      cameraPub.track.attach(videoRef.current);
    }

    // 2. Native LiveKit Event Listeners (Zero React Hook crash risk)
    const handleSpeaking = (speaking: boolean) => setIsSpeaking(speaking);
    const handleTrackMuted = (pub: any) => {
      if (pub.source === Track.Source.Camera) setCamEnabled(false);
      if (pub.source === Track.Source.Microphone) setMicEnabled(false);
    };
    const handleTrackUnmuted = (pub: any) => {
      if (pub.source === Track.Source.Camera) {
        setCamEnabled(true);
        if (pub.track && videoRef.current) pub.track.attach(videoRef.current);
      }
      if (pub.source === Track.Source.Microphone) setMicEnabled(true);
    };

    participant.on("isSpeakingChanged", handleSpeaking);
    participant.on("trackMuted", handleTrackMuted);
    participant.on("trackUnmuted", handleTrackUnmuted);

    return () => {
      if (cameraPub && cameraPub.track && videoRef.current) {
        cameraPub.track.detach(videoRef.current);
      }
      participant.off("isSpeakingChanged", handleSpeaking);
      participant.off("trackMuted", handleTrackMuted);
      participant.off("trackUnmuted", handleTrackUnmuted);
    };
  }, [participant]);

  const isTeacher = participant.identity.startsWith("teacher_");

  return (
    <div className={`relative h-full w-full bg-slate-950 rounded-2xl overflow-hidden border transition shadow-inner select-none ${
      isSpeaking ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-slate-800"
    }`}>
      {/* 1. WebRTC Video Stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={participant.isLocal}
        className={`w-full h-full object-cover ${!camEnabled ? "hidden" : "block"}`}
      />

      {/* 2. Camera OFF Avatar View */}
      {!camEnabled && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 text-white space-y-2">
          <div className={`rounded-2xl flex items-center justify-center font-black shadow-lg ${
            isSpotlight ? "w-16 h-16 text-xl bg-indigo-600 text-white" : "w-10 h-10 text-sm bg-slate-800 text-indigo-300 border border-slate-700"
          }`}>
            {participant.name ? participant.name.slice(0, 2).toUpperCase() : (isTeacher ? "MN" : "ST")}
          </div>
          {isSpotlight && (
            <span className="text-[11px] font-mono text-slate-400 font-bold">Camera is paused</span>
          )}
        </div>
      )}

      {/* 3. Bottom Name Tag & Audio Status */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-xl text-[11px] font-bold text-white border border-white/10">
          {isSpeaking && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
          <span className="truncate max-w-[120px]">
            {participant.name || (isTeacher ? "Mentor" : "Student")}
          </span>
          {isTeacher && <span className="text-[9px] bg-indigo-600 px-1 py-0.2 rounded font-mono">MENTOR</span>}
        </div>

        <div className={`p-1 rounded-lg backdrop-blur-md ${!micEnabled ? "bg-red-600/80 text-white" : "bg-black/60 text-emerald-400"}`}>
          {!micEnabled ? <MicOff size={12} /> : <Mic size={12} />}
        </div>
      </div>
    </div>
  );
}

// Master Component: Handles both empty seats and active participants safely
export function PodVideoTile({
  participant,
  label,
  isSpotlight = false,
}: {
  participant?: Participant;
  label?: string;
  isSpotlight?: boolean;
}) {
  // Empty Seat State: Zero Hooks Called, Pure Safe HTML
  if (!participant) {
    return (
      <div className="h-full w-full bg-slate-900/90 rounded-2xl flex flex-col items-center justify-center text-slate-500 text-xs border border-slate-800 select-none">
        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400 mb-1">
          <User size={14} />
        </div>
        <span className="font-mono text-[10px]">{label || "Seat Open"}</span>
      </div>
    );
  }

  // Active Participant View
  return <ActiveParticipantTile participant={participant} isSpotlight={isSpotlight} />;
}