"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function FAQKnowledgebasePage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    { q: "What makes 1:5 micro-batches different from regular online classes?", a: "In standard 100-student webinars, students stay permanently muted with camera off. In BlankLearn, exactly 5 students attend with live video and microphones enabled, ensuring the teacher speaks to every child by name." },
    { q: "Does the ML attention tracker record my child's camera video?", a: "No. Zero video is recorded or sent to any server. Google MediaPipe runs in-browser on the child's GPU to compute Eye Aspect Ratio (EAR) and head yaw. Only a mathematical focus score is shared with the parent." },
    { q: "How do Quiz Coins work during fee renewal?", a: "Students take a 5-minute micro-quiz after every class. Each coin earned gives a flat ₹1 discount. If your child earns 450 coins, you get flat ₹450 deducted from your monthly fees during Razorpay checkout." },
    { q: "Are BlankLearn mentors verified?", a: "Yes. Every mentor holds degrees from top institutions (IITs, DU, BITS), undergoes Aadhaar/KYC verification, and submits a 2-minute audited demo class before being assigned to pods." },
    { q: "What if my child misses a live class?", a: "Full HD interactive recordings with chapter bookmarks are automatically saved to your child's Classroom Vault." },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-black text-base text-slate-950">
            BL BlankLearn FAQ
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