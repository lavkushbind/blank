"use client";

import React from "react";
import Link from "next/link";
import { DollarSign, Users, Award, ShieldCheck, ArrowRight } from "lucide-react";

export default function ForTeachersLandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
              BL
            </div>
            <span className="font-black text-base tracking-tight text-slate-950">BlankLearn Teachers</span>
          </Link>
          <div className="flex items-center gap-4 text-xs font-bold">
            <Link href="/" className="text-slate-600 hover:text-slate-950">Home</Link>
            <Link href="/onboarding/teacher" className="px-4 py-2 bg-indigo-600 text-white rounded-xl">
              Apply to Teach
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 w-full space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Earn ₹45,000 - ₹90,000 / month
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight">
            Teach Small 1:5 Batches. Make Real Impact.
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            No 100-student webinar chaos. Teach 5 bright students who genuinely want to learn. We handle student matching, payment collections, and automated parent diagnostic reports.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: "Fair & Predictable Payouts", desc: "Earn ₹650 per completed 1:5 class. Direct weekly bank transfers to your account.", icon: DollarSign },
            { title: "Strictly 5 Students Max", desc: "Zero microphone mute wars. Every student is attentive and solves questions on your interactive board.", icon: Users },
            { title: "Automated Tech Stack", desc: "In-browser attention tracking, daily micro-quizzes, and voice notes handle parent transparency for you.", icon: Award },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="bg-white border border-slate-200 p-6 rounded-3xl space-y-3 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold">
                  <Icon size={20} />
                </div>
                <h3 className="text-base font-black text-slate-950">{item.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="bg-white border border-slate-200 p-8 rounded-3xl text-center space-y-4 shadow-sm">
          <h3 className="text-xl font-black text-slate-950">Join India's Top 1% Teacher Network</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Submit your degree and 2-min demo video. Super-admin review completes in 24 hours.
          </p>
          <Link
            href="/onboarding/teacher"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            Start Teacher Accreditation →
          </Link>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        BlankLearn Teacher Community • Fair Payouts & Timely Bank Settlements
      </footer>
    </div>
  );
}