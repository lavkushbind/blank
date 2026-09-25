"use client";

import { Activity } from "lucide-react";

/** No camera or attention score is collected until a real model is configured. */
export function WebAttentionTracker({ sessionId }: { sessionId: string }) {
  return (
    <aside data-session-id={sessionId} className="rounded-xl border border-slate-200 bg-white/95 p-3 text-slate-700 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-bold"><Activity size={15} className="text-slate-400"/>Attention insights</div>
      <p className="mt-1 text-[11px] leading-4 text-slate-500">Not enabled for this class. No camera attention analysis is running.</p>
    </aside>
  );
}
