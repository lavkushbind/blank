"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";

export default function LinkChildPage() {
  const [code, setCode] = useState("");
  const [linked, setLinked] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length >= 6) {
      setLinked(true);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <Link href="/home" className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1">
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
        <div>
          <h1 className="text-2xl font-black text-slate-950">Link Sibling / Child Account</h1>
          <p className="text-xs text-slate-500 mt-1">
            Enter the 6-character student code provided on your child's student portal or welcome SMS.
          </p>
        </div>

        {!linked ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">6-Character Student Pairing Code</label>
              <input
                type="text"
                required
                maxLength={8}
                placeholder="e.g. BL-9842"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full text-center tracking-widest text-lg font-black p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 uppercase"
              />
              <span className="text-[10px] text-slate-400 block text-center mt-1">
                Student can find this code in their Student Hub profile.
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
            >
              Verify & Link Account <ArrowRight size={14} />
            </button>
          </form>
        ) : (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-base font-black text-slate-900">Child Account Successfully Linked!</h3>
            <p className="text-xs text-slate-500">
              You can now switch between children using the top header dropdown.
            </p>
            <Link
              href="/home"
              className="inline-block px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl mt-2"
            >
              Go to Parent Dashboard →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}