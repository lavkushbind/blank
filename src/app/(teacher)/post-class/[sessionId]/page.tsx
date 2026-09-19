"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Check, AlertCircle, FileText, Calendar } from "lucide-react";

interface StudentReport {
  id: string;
  name: string;
  attendance: "PRESENT" | "LATE" | "ABSENT";
  mastery: "EXCELLENT" | "GOOD" | "NEEDS_HELP";
  remark: string;
}

export default function PostClassClosurePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);

  const [students, setStudents] = useState<StudentReport[]>([
    { id: "s1", name: "Aarav Sharma", attendance: "PRESENT", mastery: "EXCELLENT", remark: "Solved algebraic equations fast. Ready for word problems." },
    { id: "s2", name: "Riya Verma", attendance: "PRESENT", mastery: "EXCELLENT", remark: "Answered live polls accurately. Excellent participation." },
    { id: "s3", name: "Kabir Mehta", attendance: "PRESENT", mastery: "GOOD", remark: "Understood concepts well. Needs practice with sign conversions." },
    { id: "s4", name: "Ananya Iyer", attendance: "PRESENT", mastery: "EXCELLENT", remark: "Active on whiteboard steps. Completed all practice questions." },
    { id: "s5", name: "Vihaan Patel", attendance: "LATE", mastery: "NEEDS_HELP", remark: "Joined 10 mins late. Needs revision of Exercise 4.2." },
  ]);

  const [assignedHomework, setAssignedHomework] = useState("NCERT Exercise 4.2 (Questions 1 to 6) in handwritten notebook.");
  const [nextTopic, setNextTopic] = useState("Linear Equations with Variables on Both Sides");
  const [submitted, setSubmitted] = useState(false);

  const updateStudent = (id: string, key: keyof StudentReport, value: any) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, [key]: value } : s));
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 p-8 rounded-3xl shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 size={32} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-950">Class Session Completed!</h2>
            <p className="text-xs text-slate-500">Batch #{sessionId} attendance and academic reports have been dispatched to parents.</p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-left space-y-1.5 font-medium text-slate-600">
            <div className="flex justify-between"><span>Teacher Payout:</span><strong className="text-emerald-700 font-mono">+₹650 Credited to Wallet</strong></div>
            <div className="flex justify-between"><span>Students Evaluated:</span><strong className="text-slate-900">5/5 Enrolled</strong></div>
          </div>
          <Link
            href="/dashboard"
            className="block w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            Return to Dashboard →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Session Wrap-Up Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2.5 py-0.5 rounded">
            Class Completed • 60 Mins
          </span>
          <h1 className="text-2xl font-black text-slate-950 mt-1">Class Wrap-Up Report • Batch #{sessionId}</h1>
          <p className="text-xs text-slate-500">
            Confirm student attendance, conceptual mastery ratings, and next homework.
          </p>
        </div>
        <button
          onClick={() => setSubmitted(true)}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 shrink-0"
        >
          Submit Class Report & Close Batch <ArrowRight size={14} />
        </button>
      </div>

      {/* 5-Student Assessment Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-sm font-black text-slate-900">Student Performance Evaluation (5 Enrolled)</h3>
          <span className="text-xs font-bold text-slate-400">Strict 1:5 Pod</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {students.map((s, idx) => (
            <div key={s.id} className="p-5 space-y-3 hover:bg-slate-50/60 transition">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900">{s.name}</h4>
                    <span className="text-[11px] text-slate-400 font-medium">Student #{s.id}</span>
                  </div>
                </div>

                {/* Attendance Buttons */}
                <div className="flex items-center gap-1.5">
                  {(["PRESENT", "LATE", "ABSENT"] as const).map((att) => (
                    <button
                      key={att}
                      type="button"
                      onClick={() => updateStudent(s.id, "attendance", att)}
                      className={`px-3 py-1 rounded-lg font-bold text-[10px] transition ${
                        s.attendance === att
                          ? att === "PRESENT" ? "bg-emerald-600 text-white shadow-sm" : att === "LATE" ? "bg-amber-500 text-white shadow-sm" : "bg-red-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {att}
                    </button>
                  ))}
                </div>

                {/* Concept Mastery Buttons */}
                <div className="flex items-center gap-1.5">
                  {[
                    { key: "EXCELLENT", label: "Excellent (90%+)" },
                    { key: "GOOD", label: "Good" },
                    { key: "NEEDS_HELP", label: "Needs Practice" },
                  ].map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => updateStudent(s.id, "mastery", m.key)}
                      className={`px-3 py-1 rounded-lg font-bold text-[10px] transition border ${
                        s.mastery === m.key
                          ? "bg-indigo-50 border-indigo-600 text-indigo-950 font-black"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Written Feedback Input */}
              <div>
                <input
                  type="text"
                  value={s.remark}
                  onChange={(e) => updateStudent(s.id, "remark", e.target.value)}
                  placeholder="Teacher's academic note for parent..."
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-white"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Homework & Next Session Plan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-2">
          <label className="block text-xs font-bold text-slate-700">Homework Task Assigned</label>
          <input
            type="text"
            value={assignedHomework}
            onChange={(e) => setAssignedHomework(e.target.value)}
            className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-200"
          />
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-2">
          <label className="block text-xs font-bold text-slate-700">Next Session Topic</label>
          <input
            type="text"
            value={nextTopic}
            onChange={(e) => setNextTopic(e.target.value)}
            className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-200"
          />
        </div>
      </div>
    </div>
  );
}