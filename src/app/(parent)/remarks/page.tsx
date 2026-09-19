"use client";

import React from "react";
import Link from "next/link";
import { Calendar, UserCheck, CheckCircle2 } from "lucide-react";

export default function TeacherRemarksLogPage() {
  const logs = [
    {
      id: "log_01",
      date: "Today, 06:00 PM",
      subject: "Mathematics • Linear Equations",
      mentor: "Rahul Sharma Sir (IIT Delhi)",
      mastery: "Excellent (95%)",
      feedback: "Solved algebraic equations fast. Ready for word problem applications. Assigned Exercise 4.2."
    },
    {
      id: "log_02",
      date: "18 September 2026",
      subject: "Science • Thermal Equilibrium",
      mentor: "Pooja Verma Ma'am (DU)",
      mastery: "Good (85%)",
      feedback: "Understood temperature transfer concepts. Participated in interactive worksheet discussion."
    },
    {
      id: "log_03",
      date: "15 September 2026",
      subject: "Mathematics • Polynomials",
      mentor: "Rahul Sharma Sir (IIT Delhi)",
      mastery: "Excellent (90%)",
      feedback: "Calculation speed has improved significantly compared to last term. All quiz answers correct."
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-950">Academic Feedback Log</h1>
        <p className="text-xs text-slate-500">Official written feedback submitted by batch mentors after every live class.</p>
      </div>

      <div className="space-y-4">
        {logs.map((log) => (
          <div key={log.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">{log.subject}</h3>
                <p className="text-xs text-slate-500">Mentor: {log.mentor}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-slate-400">{log.date}</span>
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                  {log.mastery}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-3 rounded-2xl border border-slate-100">
              "{log.feedback}"
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}