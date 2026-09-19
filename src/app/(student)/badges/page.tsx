"use client";

import React from "react";
import { Award, Sparkles, Lock, Check } from "lucide-react";

export default function StudentBadgesPage() {
  const badges = [
    { title: "Math Titan", desc: "Maintained 90%+ in algebra tests", cost: 300, unlocked: true },
    { title: "7-Day Flame", desc: "Attended 7 classes consecutively", cost: 200, unlocked: true },
    { title: "Speed Solver", desc: "Answered live polls in under 10 seconds", cost: 500, unlocked: false },
    { title: "STEM Wizard", desc: "Completed all science lab simulations", cost: 600, unlocked: false },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex justify-between items-end border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-950">Achievements & Badge Shop</h1>
          <p className="text-xs text-slate-500">Unlock titles with your earned Quiz Coins. Coins also reduce monthly renewal fees!</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-2xl text-indigo-900 font-black text-sm">
          🪙 Available: 450 Coins
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {badges.map((b, i) => (
          <div key={i} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
                b.unlocked ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"
              }`}>
                <Award size={24} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">{b.title}</h4>
                <p className="text-xs text-slate-500">{b.desc}</p>
                <span className="text-[11px] font-mono font-bold text-amber-600">Cost: {b.cost} Coins</span>
              </div>
            </div>

            <div>
              {b.unlocked ? (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                  <Check size={13} /> Unlocked
                </span>
              ) : (
                <button className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1">
                  <Lock size={12} /> Unlock
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}