import React from "react";
import Link from "next/link";
import { Flame, Sparkles } from "lucide-react";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Crisp White Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/hub" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm shadow-indigo-500/30">
                BL
              </div>
              <div>
                <span className="font-black text-base tracking-tight text-slate-950">BlankLearn</span>
                <span className="block text-[9px] font-bold text-emerald-600 uppercase tracking-wider -mt-1">
                  Student Pod
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-5 text-xs font-bold text-slate-600">
              <Link href="/hub" className="hover:text-indigo-600 transition">Pod Hub</Link>
              <Link href="/homework" className="hover:text-indigo-600 transition">Homework</Link>
              <Link href="/vault" className="hover:text-indigo-600 transition">Class Vault</Link>
              <Link href="/badges" className="hover:text-indigo-600 transition">Badges</Link>
            </nav>
          </div>

          {/* Gamification Counters & User Status */}
          <div className="flex items-center gap-3">
            {/* Streak Flame */}
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full text-xs font-black text-amber-800 shadow-sm">
              <Flame size={15} className="text-amber-500 fill-amber-500 animate-bounce" />
              <span>7 Days Streak</span>
            </div>

            {/* Quiz Coins Vault */}
            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full text-xs font-black text-indigo-900 shadow-sm">
              <Sparkles size={14} className="text-indigo-600" />
              <span>🪙 450 Coins</span>
            </div>

            <Link
              href="/login"
              className="text-xs font-bold text-slate-500 hover:text-red-600 px-2 py-1"
            >
              Exit
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}