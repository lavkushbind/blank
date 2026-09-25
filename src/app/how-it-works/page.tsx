"use client";

import React from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { 
  Users, 
  Video, 
  Activity, 
  Award, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles 
} from "lucide-react";

export default function HowItWorksPage() {
  const steps = [
    {
      num: "01",
      title: "Diagnostic Matching into a 1:5 Pod",
      desc: "Based on Grade (Classes 6-10), Board (CBSE/ICSE), and school learning speed, your child is grouped with exactly 4 other students. System strictly forbids any 6th student from joining.",
      icon: Users,
    },
    {
      num: "02",
      title: "Interactive Live Classroom with Camera Active",
      desc: "Every student has an active microphone and webcam. The master teacher uses a collaborative digital whiteboard where students write math steps live. No student stays muted.",
      icon: Video,
    },
    {
      num: "03",
      title: "In-Browser ML Attention Engine",
      desc: "Using client-side Google MediaPipe WebAssembly, the system tracks eye-aspect ratio (EAR) and head-pose on the student device. If your child gets sleepy or distracted, a gentle reminder chimes.",
      icon: Activity,
    },
    {
      num: "04",
      title: "Mandatory Teacher Voice Note & Coins",
      desc: "The teacher records an authentic 45-second personalized audio update right after class. Your child attempts a 5-minute quiz to earn Quiz Coins that give flat discounts on monthly fees.",
      icon: Award,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
              <BrandLogo className="h-full w-full rounded-[inherit] object-cover" />
            </div>
            <span className="font-black text-base tracking-tight text-slate-950">BlankLearn</span>
          </Link>
          <div className="flex items-center gap-4 text-xs font-bold">
            <Link href="/" className="text-slate-600 hover:text-slate-950">Home</Link>
            <Link href="/pricing" className="text-slate-600 hover:text-slate-950">Pricing</Link>
            <Link href="/#demo-section" className="px-4 py-2 bg-indigo-600 text-white rounded-xl">
              Book Free Demo
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 w-full space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
            The Micro-Batch Method
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight">
            How BlankLearn Delivers 100% Focus.
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            We eliminated large webinar batches and replaced them with strict 5-student pods, in-browser AI attention tracking, and daily teacher audio notes.
          </p>
        </div>

        <div className="space-y-6">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div key={idx} className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col sm:flex-row items-start gap-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0 font-black">
                  <Icon size={26} />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-600">STEP {s.num}</span>
                    <span className="text-slate-300">•</span>
                    <h3 className="text-lg font-black text-slate-950">{s.title}</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white p-8 rounded-3xl text-center space-y-4">
          <h3 className="text-xl sm:text-2xl font-black">Ready to experience a real 1:5 pod?</h3>
          <p className="text-xs text-indigo-200 max-w-md mx-auto">
            Book a free 60-minute diagnostic session. Sit with your child and see the difference.
          </p>
          <Link
            href="/#demo-section"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-indigo-50 text-indigo-950 font-black text-xs rounded-xl shadow-xl transition"
          >
            Book Free Diagnostic Demo <ArrowRight size={14} />
          </Link>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        BlankLearn • 100% Web-Native Standalone EdTech
      </footer>
    </div>
  );
}