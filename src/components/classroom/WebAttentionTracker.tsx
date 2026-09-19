"use client";

import React, { useEffect, useRef, useState } from "react";
import { Activity, AlertTriangle } from "lucide-react";

export function WebAttentionTracker({ sessionId }: { sessionId: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  
  const [alertActive, setAlertActive] = useState<boolean>(false);
  const [attentionScore, setAttentionScore] = useState<number>(100);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let intervalId: NodeJS.Timeout;

    // 1. Initialize Background Web Worker for Heavy ML Processing
    workerRef.current = new Worker(new URL("../../lib/ml/faceMeshWorker.ts", import.meta.url));

    workerRef.current.onmessage = (e) => {
      const { type, isDistracted, ear, yaw } = e.data;
      if (type === "RESULT") {
        if (isDistracted) {
          setAlertActive(true);
          setAttentionScore((prev) => Math.max(prev - 2, 40));
        } else {
          setAlertActive(false);
          setAttentionScore((prev) => Math.min(prev + 1, 100));
        }
      }
    };

    // 2. Initialize Camera Feed
    async function initCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Attention tracker: Camera access denied.");
        setIsActive(false);
      }
    }

    initCamera();

    // 3. Send frames to Worker every 2 seconds
    intervalId = setInterval(() => {
      if (workerRef.current && isActive) {
        workerRef.current.postMessage({ type: "PROCESS_FRAME" });
      }
    }, 2000);

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (workerRef.current) workerRef.current.terminate();
    };
  }, [sessionId, isActive]);

  if (!isActive) return null;

  return (
    <div className="absolute top-20 right-6 z-40 bg-white/95 backdrop-blur-md border border-slate-200 p-2.5 rounded-2xl shadow-xl flex items-center gap-3 w-48 transition-all">
      <video ref={videoRef} autoPlay playsInline muted className="w-10 h-10 object-cover rounded-xl border border-slate-200 bg-slate-900 shadow-sm" />
      
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Activity size={12} className={attentionScore > 75 ? "text-emerald-600" : "text-amber-500"} />
            <span className="text-[10px] font-black text-slate-900">Focus</span>
          </div>
          <span className={`text-[11px] font-mono font-bold ${attentionScore > 75 ? "text-emerald-700" : "text-amber-600"}`}>
            {attentionScore}%
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${attentionScore > 75 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${attentionScore}%` }} />
        </div>

        {alertActive && (
          <span className="text-[9px] text-red-600 font-bold flex items-center gap-1 mt-1 animate-pulse">
            <AlertTriangle size={10} /> Eyes on screen
          </span>
        )}
      </div>
    </div>
  );
}