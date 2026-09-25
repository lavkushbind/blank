"use client";

import React, { useState, useEffect } from "react";
import { useRoomContext } from "@livekit/components-react";
import { Hand, Check, Mic } from "lucide-react";

export function RaiseHandQueue({ participantName, isTeacher = false }: { participantName: string; isTeacher?: boolean }) {
  const room = useRoomContext();
  const [handRaised, setHandRaised] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);

  useEffect(() => {
    if (!room) return;
    const handleData = (payload: Uint8Array) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.event === "RAISE_HAND") {
          setQueue((prev) => Array.from(new Set([...prev, data.studentName])));
        } else if (data.event === "LOWER_HAND") {
          setQueue((prev) => prev.filter((name) => name !== data.studentName));
          if (data.studentName === participantName) setHandRaised(false);
        }
      } catch {
        // Ignore unrelated or non-JSON room packets.
      }
    };
    room.on("dataReceived", handleData);
    return () => { room.off("dataReceived", handleData); };
  }, [room, participantName]);

  const toggleHand = () => {
    if (!room || isTeacher) return;
    const nextState = !handRaised;
    setHandRaised(nextState);

    const event = nextState ? "RAISE_HAND" : "LOWER_HAND";
    const packet = { event, studentName: participantName };
    const encoder = new TextEncoder();
    room.localParticipant.publishData(encoder.encode(JSON.stringify(packet)) as any, { reliable: true });
  };

  const teacherDismiss = (studentName: string) => {
    if (!room || !isTeacher) return;
    setQueue((prev) => prev.filter((s) => s !== studentName));
    const packet = { event: "LOWER_HAND", studentName };
    const encoder = new TextEncoder();
    room.localParticipant.publishData(encoder.encode(JSON.stringify(packet)) as any, { reliable: true });
  };

  return (
    <>
      {/* Student: Raise Hand Button */}
      {!isTeacher && (
        <button
          onClick={toggleHand}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
            handRaised
              ? "bg-amber-500 text-white animate-pulse"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
          }`}
        >
          <Hand size={15} />
          <span>{handRaised ? "Hand Raised ✋" : "Raise Hand"}</span>
        </button>
      )}

      {/* Teacher: Live Doubt Queue Pill */}
      {isTeacher && queue.length > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-xs">
          <span className="font-bold text-amber-900">✋ Doubts Queue ({queue.length}):</span>
          <div className="flex items-center gap-1.5">
            {queue.map((name) => (
              <span
                key={name}
                onClick={() => teacherDismiss(name)}
                className="bg-white border border-amber-300 text-amber-950 font-bold px-2 py-0.5 rounded-lg cursor-pointer hover:bg-amber-100 flex items-center gap-1 text-[11px]"
                title="Click to allow speak / dismiss"
              >
                {name} <Check size={11} className="text-emerald-600" />
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
