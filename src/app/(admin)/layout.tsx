import React from "react";
import Link from "next/link";
import { Shield } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/kyc-approval" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                BL
              </div>
              <div>
                <span className="font-black text-base text-slate-950">BlankLearn Admin</span>
                <span className="block text-[9px] font-bold text-red-600 uppercase tracking-wider -mt-1 font-mono">
                  Super-Admin Command
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-5 text-xs font-bold text-slate-600">
              <Link href="/kyc-approval" className="hover:text-indigo-600">KYC Approval</Link>
              <Link href="/batch-builder" className="hover:text-indigo-600">1:5 Matchmaker</Link>
              <Link href="/live-radar" className="hover:text-indigo-600">Live Radar</Link>
              <Link href="/payouts" className="hover:text-indigo-600">Payouts</Link>
              <Link href="/analytics" className="hover:text-indigo-600">Analytics</Link>
              <Link href="/support" className="hover:text-indigo-600">Support Desk</Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
              ● All Systems Normal
            </span>
            <Link href="/login" className="text-xs font-bold text-slate-500 hover:text-red-600 px-2 py-1">
              Logout
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}