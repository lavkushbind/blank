"use client";

import React from "react";

interface AttentionPoint {
  minute: number; // 1 to 60
  score: number;  // 0 to 100
  isDrowsy?: boolean;
}

export function AttentionCurveChart({ data }: { data?: AttentionPoint[] }) {
  const points = (data || []).filter((point) => Number.isFinite(point.minute) && Number.isFinite(point.score));

  const width = 700;
  const height = 220;
  const padding = 30;

  const pointsCoordinates = points.map((p) => {
    const x = padding + ((p.minute - 1) / 59) * (width - padding * 2);
    const y = height - padding - (p.score / 100) * (height - padding * 2);
    return { x, y, ...p };
  });

  const pathD = pointsCoordinates.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, "");

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-white text-sm font-bold">Class attention data</h3>
          <p className="text-slate-400 text-xs">Only measured session data is shown.</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Optimal Focus (&gt;75%)
          </span>
          <span className="flex items-center gap-1.5 text-red-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Distraction / Sleep Flag
          </span>
        </div>
      </div>

      {points.length === 0 ? <div className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-8 text-center text-xs text-slate-400">No attention data was recorded for this session.</div> : <div className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48">
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeDasharray="3" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#334155" strokeDasharray="3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#475569" />

          {/* Attention Line Path */}
          <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />

          {/* Drowsy / Distraction Warning Markers */}
          {pointsCoordinates.filter((p) => p.isDrowsy).map((flagPoint, idx) => (
            <g key={idx}>
              <circle cx={flagPoint.x} cy={flagPoint.y} r="5" fill="#ef4444" className="animate-ping opacity-75" />
              <circle cx={flagPoint.x} cy={flagPoint.y} r="4" fill="#ef4444" />
            </g>
          ))}
        </svg>
      </div>}
    </div>
  );
}
