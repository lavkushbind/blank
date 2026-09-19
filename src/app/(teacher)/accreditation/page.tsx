"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, FileText, Video } from "lucide-react";

export default function TeacherAccreditationPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-black text-slate-950">Teacher Accreditation & KYC Verification</h1>
        <p className="text-xs text-slate-500">Review your verification credentials and accreditation badges.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-emerald-900">
          <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
          <div>
            <h3 className="text-sm font-black">Account 100% Accredited & Verified</h3>
            <p className="text-xs text-emerald-800">Your profile is active in the public 1:5 Teacher Directory.</p>
          </div>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          <div className="py-3 flex justify-between items-center">
            <span className="font-semibold text-slate-700 flex items-center gap-2">
              <FileText size={15} className="text-slate-400" /> Aadhaar Card Verification
            </span>
            <span className="font-bold text-emerald-700">✓ VERIFIED</span>
          </div>
          <div className="py-3 flex justify-between items-center">
            <span className="font-semibold text-slate-700 flex items-center gap-2">
              <ShieldCheck size={15} className="text-slate-400" /> B.Tech (IIT Delhi) Degree Certificate
            </span>
            <span className="font-bold text-emerald-700">✓ VERIFIED</span>
          </div>
          <div className="py-3 flex justify-between items-center">
            <span className="font-semibold text-slate-700 flex items-center gap-2">
              <Video size={15} className="text-slate-400" /> 2-Min Demo Video Audit
            </span>
            <span className="font-bold text-emerald-700">✓ AUDITED (Grade: A+)</span>
          </div>
        </div>
      </div>
    </div>
  );
}