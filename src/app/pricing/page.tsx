"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

export default function PricingPage() {
  const [coinsRedeemed, setCoinsRedeemed] = useState(450);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
              BL
            </div>
            <span className="font-black text-base tracking-tight text-slate-950">BlankLearn Pricing</span>
          </Link>
          <div className="flex items-center gap-4 text-xs font-bold">
            <Link href="/" className="text-slate-600 hover:text-slate-950">Home</Link>
            <Link href="/teachers" className="text-slate-600 hover:text-slate-950">Find Teachers</Link>
            <Link href="/#demo-section" className="px-4 py-2 bg-indigo-600 text-white rounded-xl">
              Book Free Demo
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 w-full space-y-12">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
            Predictable & Affordable
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight">
            Transparent Monthly Fees.
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">Quality of a ₹1,000/hr private home tutor, at just ₹290 per class.</p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Monthly */}
          <div className="bg-white border border-slate-200 p-8 rounded-3xl space-y-6 shadow-sm">
            <div>
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                Monthly 1:5 Pod
              </span>
              <h3 className="text-3xl font-black text-slate-950 mt-4">₹3,499 <span className="text-sm font-normal text-slate-500">/ month</span></h3>
              <p className="text-xs text-slate-500 mt-1">12 Live Sessions • 3 classes per week</p>
            </div>

            <ul className="space-y-3 text-xs text-slate-700">
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> Max 5 Students strictly enforced</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> Daily Teacher Voice Remarks on WhatsApp</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> In-Browser ML Attention Diagnostics</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> Daily Micro-Quizzes & Coin Rewards</li>
            </ul>

            <Link
              href="/#demo-section"
              className="block w-full py-3.5 text-center bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
            >
              Start With Free Demo
            </Link>
          </div>

          {/* Quarterly */}
          <div className="bg-white border-2 border-indigo-600 p-8 rounded-3xl space-y-6 relative shadow-xl shadow-indigo-100">
            <div className="absolute -top-3.5 right-8 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full">
              Recommended • 15% Savings
            </div>

            <div>
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full">
                Quarterly Mastery Pod
              </span>
              <h3 className="text-3xl font-black text-slate-950 mt-4">₹8,999 <span className="text-sm font-normal text-slate-500">/ 3 months</span></h3>
              <p className="text-xs text-slate-500 mt-1">36 Live Sessions • Syllabus Guarantee</p>
            </div>

            <ul className="space-y-3 text-xs text-slate-700">
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> Everything in Monthly Pod</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> Complete CBSE / ICSE Mock Exam Series</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> Dedicated Mentor Priority Chat Desk</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> Flat ₹1,000 Coin Discount eligible</li>
            </ul>

            <Link
              href="/#demo-section"
              className="block w-full py-3.5 text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              Reserve Pod Seat Today
            </Link>
          </div>
        </div>

        {/* Interactive Quiz Coins Discount Simulator */}
        <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Sparkles size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900">Student Quiz Coins Savings Calculator</h4>
              <p className="text-xs text-slate-500">Every correct answer in daily micro-quizzes earns coins. 1 Coin = ₹1 Flat Discount on renewal.</p>
            </div>
          </div>

          <div className="pt-3 space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span>Coins Earned by Student:</span>
              <span className="font-mono text-indigo-600">🪙 {coinsRedeemed} Coins</span>
            </div>
            <input
              type="range"
              min="0"
              max="1000"
              step="50"
              value={coinsRedeemed}
              onChange={(e) => setCoinsRedeemed(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between items-center text-xs pt-2">
              <span className="text-slate-500">Monthly Renewal Price with Coins:</span>
              <span className="text-lg font-black text-emerald-700 font-mono">
                ₹{3499 - coinsRedeemed} <span className="text-xs text-slate-400 font-normal line-through">₹3,499</span>
              </span>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        BlankLearn • 100% Money-Back Guarantee if dissatisfied after first 2 classes
      </footer>
    </div>
  );
}