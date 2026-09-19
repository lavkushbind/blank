"use client";

import React from "react";
import Link from "next/link";
import { Eye, Radio, Shield } from "lucide-react";

export default function AdminLiveRadarPage() {
  const activeRooms = [
    { id: "batch-demo-101", name: "Class 7 - Linear Equations", teacher: "Rahul Sharma Sir", students: "5/5", bitrate: "1080p @ 60 FPS", duration: "24 mins" },
    { id: "batch-sci-202", name: "Class 8 - Acids & Bases", teacher: "Pooja Verma Ma'am", students: "4/5", bitrate: "720p @ 30 FPS", duration: "42 mins" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="border-b border-slate-200 pb-6 flex justify-between items-end">
        <div>
          <span className="text-xs font-mono font-bold text-emerald-700 uppercase flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Real-Time WebRTC Radar
          </span>
          <h1 className="text-2xl font-black text-slate-950 mt-1">Live Classroom Inspector</h1>
          <p className="text-xs text-slate-500">
            Ghost Inspector Mode: Audit teaching quality without interrupting class or activating camera.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {activeRooms.map((r) => (
          <div key={r.id} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">{r.name}</h3>
                <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                  {r.students} Present
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Mentor: {r.teacher} • Video Stream: {r.bitrate} • Live for {r.duration}
              </p>
            </div>

            <Link
              href={`/classroom/${r.id}`}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Eye size={14} /> Join as Ghost Inspector
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}