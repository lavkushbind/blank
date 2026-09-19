"use client";

import React from "react";
import { Flame } from "lucide-react";

export function StreakFlameBadge({ streakCount = 7 }: { streakCount?: number }) {
  return (
    <div className="flex items-center gap-1.5 bg-amber-950/80 border border-amber-600/40 px-3 py-1 rounded-full shadow-inner">
      <Flame className="w-4 h-4 text-amber-500 animate-bounce" />
      <span className="text-xs font-black text-amber-400 font-mono">{streakCount} Day Streak</span>
    </div>
  );
}