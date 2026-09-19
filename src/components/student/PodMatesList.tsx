"use client";

import React from "react";

interface PodMate {
  name: string;
  points: number;
  initials: string;
}

export function PodMatesList() {
  const mates: PodMate[] = [
    { name: "Riya", points: 420, initials: "RV" },
    { name: "Kabir", points: 390, initials: "KM" },
    { name: "Ananya", points: 450, initials: "AI" },
    { name: "Vihaan", points: 380, initials: "VP" },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
      <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">Your 1:5 Podmates</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {mates.map((mate, i) => (
          <div key={i} className="flex items-center gap-2.5 bg-slate-950 p-2 rounded-xl border border-slate-800/80">
            <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center font-bold text-xs text-indigo-300">
              {mate.initials}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">{mate.name}</p>
              <p className="text-[10px] font-mono text-amber-400">🪙 {mate.points} pts</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}