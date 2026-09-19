"use client";

import React from "react";
import { CheckCircle2, BookOpen } from "lucide-react";

export default function ParentSyllabusPage() {
  const chapters = [
    { name: "1. Integers & Operations", status: "COMPLETED", mastery: 95 },
    { name: "2. Fractions and Decimals", status: "COMPLETED", mastery: 90 },
    { name: "3. Data Handling & Graphs", status: "COMPLETED", mastery: 85 },
    { name: "4. Simple Linear Equations", status: "IN PROGRESS", mastery: 70 },
    { name: "5. Lines and Angles", status: "UPCOMING", mastery: 0 },
    { name: "6. The Triangle and Its Properties", status: "UPCOMING", mastery: 0 },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex justify-between items-end border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-950">CBSE Class 7 Mathematics Syllabus</h1>
          <p className="text-xs text-slate-500">Track exact chapter mastery and school exam preparation pace.</p>
        </div>
        <div className="bg-indigo-50 text-indigo-700 font-bold text-xs px-3 py-1.5 rounded-xl border border-indigo-200">
          Term 2 Progress: 68%
        </div>
      </div>

      <div className="space-y-3">
        {chapters.map((ch, idx) => (
          <div key={idx} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-900">{ch.name}</h4>
              <div className="w-48 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${ch.mastery}%` }} />
              </div>
            </div>

            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
              ch.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" :
              ch.status === "IN PROGRESS" ? "bg-amber-100 text-amber-800" :
              "bg-slate-100 text-slate-500"
            }`}>
              {ch.status} ({ch.mastery}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}