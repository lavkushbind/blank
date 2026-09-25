"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export default function FAQKnowledgebasePage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    { q: "What makes small group classes different?", a: "Classes support groups of up to five students, with live video, audio and classroom tools. Actual attendance depends on who joins the session." },
    { q: "Does BlankLearn track a student's attention from their camera?", a: "No. Camera based attention tracking is currently unavailable. The classroom does not calculate or report attention scores." },
    { q: "Can Quiz Coins be used toward fees?", a: "Students can earn coins from quizzes and use them to unlock profile badges. Fee discounts using coins are not currently available at checkout." },
    { q: "Are BlankLearn mentors verified?", a: "Teacher profiles may require review before approval. Check the teacher profile and class details shown in your account for current verification status." },
    { q: "What if my child misses a live class?", a: "Check the class Vault for teacher shared notes and learning materials. Class recordings are not currently available." },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-black text-base text-slate-950">
            <BrandLogo className="mr-2 inline-block h-7 w-7 rounded-lg object-cover align-middle" /> BlankLearn FAQ
          </Link>
          <Link href="/" className="text-xs font-bold text-slate-600 hover:text-slate-950">Home</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-slate-950">Frequently Asked Questions</h1>
          <p className="text-xs text-slate-500">Everything you need to know about our 1:5 pods, technology, and fees.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full text-left p-5 flex justify-between items-center text-xs sm:text-sm font-bold text-slate-900 hover:bg-slate-50"
              >
                <span>{f.q}</span>
                <span className="text-indigo-600 font-mono text-base">{openIdx === i ? "−" : "+"}</span>
              </button>
              {openIdx === i && (
                <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        BlankLearn FAQ & Knowledgebase
      </footer>
    </div>
  );
}
