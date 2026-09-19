"use client";

import React, { use } from "react";
import Link from "next/link";
import { CheckCircle2, Calendar, UserCheck, BookOpen, Award, ArrowRight, ShieldCheck } from "lucide-react";

export default function ParentSessionReportPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      
      {/* Executive Session Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
        <div>
          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded uppercase">
            Official Academic Report
          </span>
          <h1 className="text-2xl font-black text-slate-950 mt-1">Class Report • Aarav Sharma</h1>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 font-medium">
            <span className="flex items-center gap-1"><Calendar size={13} /> Today, 05:00 PM - 06:00 PM</span>
            <span>•</span>
            <span className="flex items-center gap-1"><UserCheck size={13} /> Mentor: Rahul Sharma Sir (IIT Delhi)</span>
            <span>•</span>
            <span className="font-mono font-bold">Batch #{sessionId}</span>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-center min-w-[120px]">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Attendance</span>
          <span className="text-base font-black text-emerald-800">Present (On Time)</span>
        </div>
      </div>

      {/* 1. Academic Performance Scorecard */}
      <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-sm space-y-5">
        <h3 className="text-base font-black text-slate-950">Academic Performance & Engagement</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-1">
            <span className="text-xs text-slate-400 font-bold">Conceptual Clarity</span>
            <p className="text-lg font-black text-slate-900">Excellent (95%)</p>
            <p className="text-[11px] text-slate-500">Solved algebraic balance equations accurately.</p>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-1">
            <span className="text-xs text-slate-400 font-bold">In-Class Live Polls</span>
            <p className="text-lg font-black text-indigo-600">4 / 4 Correct</p>
            <p className="text-[11px] text-slate-500">100% accuracy on concept check questions.</p>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-1">
            <span className="text-xs text-slate-400 font-bold">1:5 Pod Participation</span>
            <p className="text-lg font-black text-emerald-700">Active & Alert</p>
            <p className="text-[11px] text-slate-500">Volunteered steps on the live whiteboard.</p>
          </div>
        </div>
      </div>

      {/* 2. Mentor Written Assessment */}
      <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-black text-slate-950">Mentor's Written Assessment</h3>
          <span className="text-xs font-bold text-indigo-600">Rahul Sharma Sir</span>
        </div>

        <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 font-medium">
          "Aarav was exceptionally alert today. He has mastered linear transposition rules and solved Question 4 on the board independently without any sign errors. He is ready for word problem applications."
        </p>

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-400 font-bold">Homework Assigned:</span>
            <span className="text-slate-900 font-bold ml-1.5">Exercise 4.2 (Q1 to Q6)</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold">Next Session Topic:</span>
            <span className="text-indigo-600 font-bold ml-1.5">Linear Equations with Variables on Both Sides</span>
          </div>
        </div>
      </div>

      {/* 3. Action Links */}
      <div className="flex justify-between items-center text-xs">
        <Link href="/parent-chat/rahul-sharma" className="text-indigo-600 font-bold hover:underline">
          Message Rahul Sir directly on Parent Chat Desk →
        </Link>
        <Link href="/billing" className="text-slate-500 hover:text-slate-900 font-semibold">
          Check 1:5 Pod Renewal Status
        </Link>
      </div>

    </div>
  );
}