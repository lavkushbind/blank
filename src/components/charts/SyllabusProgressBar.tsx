import React from "react";
export function SyllabusProgressBar({ progress }: { progress: number }) {
  return <div className="w-full bg-slate-100 h-2 rounded-full"><div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${progress}%` }} /></div>;
}