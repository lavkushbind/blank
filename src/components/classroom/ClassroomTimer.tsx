"use client";

import React, { useState, useEffect } from "react";
import { useRoomContext } from "@livekit/components-react";
import { Timer, Play, Pause, RotateCcw } from "lucide-react";

export function ClassroomTimer({ isTeacher = false }: { isTeacher?: boolean }) {
  const room = useRoomContext();
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    } else if (secondsLeft === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft]);

  return (
    <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-2xl shadow-sm text-xs">
      <Timer size={14} className={secondsLeft < 10 ? "text-red-500 animate-spin" : "text-indigo-600"} />
      <span className={`font-mono font-black ${secondsLeft < 10 ? "text-red-600" : "text-slate-900"}`}>
        {Math.floor(secondsLeft / 60)}:{(secondsLeft % 60).toString().padStart(2, "0")}
      </span>

      {isTeacher && (
        <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
          <button onClick={() => setIsRunning(!isRunning)} className="p-1 hover:text-indigo-600">
            {isRunning ? <Pause size={12} /> : <Play size={12} />}
          </button>
          <button onClick={() => { setIsRunning(false); setSecondsLeft(60); }} className="p-1 hover:text-slate-900">
            <RotateCcw size={12} />
          </button>
        </div>
      )}
    </div>
  );
}