import React from "react";
import Link from "next/link";
import { CheckCircle2, Wallet } from "lucide-react";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Crisp White Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm shadow-indigo-500/30">
                BL
              </div>
              <div>
                <span className="font-black text-base tracking-tight text-slate-950">BlankLearn Studio</span>
                <span className="block text-[9px] font-bold text-indigo-600 uppercase tracking-wider -mt-1">
                  Mentor Workspace
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-5 text-xs font-bold text-slate-600">
              <Link href="/dashboard" className="hover:text-indigo-600 transition">Dashboard</Link>
              <Link href="/batches" className="hover:text-indigo-600 transition">My 1:5 Batches</Link>
              <Link href="/review-homework" className="hover:text-indigo-600 transition">Review Homework</Link>
              <Link href="/wallet" className="hover:text-indigo-600 transition">Wallet & Payouts</Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* KYC Verified Pill */}
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold text-emerald-800">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>KYC Verified</span>
            </div>

            {/* Wallet Balance Pill */}
            <Link
              href="/wallet"
              className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full text-xs font-black text-indigo-900 hover:bg-indigo-100 transition shadow-sm"
            >
              <Wallet size={14} className="text-indigo-600" />
              <span>₹28,600</span>
            </Link>

            <Link
              href="/login"
              className="text-xs font-bold text-slate-500 hover:text-red-600 px-2 py-1"
            >
              Logout
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}