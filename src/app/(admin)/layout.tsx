"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Shield } from "lucide-react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { BrandLogo } from "@/components/BrandLogo";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [access, setAccess] = useState<"checking" | "allowed" | "denied">("checking");

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) { setAccess("denied"); return; }
    try {
      const token = await user.getIdTokenResult(true);
      setAccess(token.claims.admin === true ? "allowed" : "denied");
    } catch (error) {
      console.error("Admin authorization check failed", error);
      setAccess("denied");
    }
  }), []);

  if (access !== "allowed") {
    return <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      {access === "checking" ? <><Loader2 className="animate-spin text-indigo-600"/><p className="mt-3 text-sm text-slate-600">Checking administrator access…</p></> : <><Shield className="text-red-600" size={32}/><h1 className="mt-3 text-xl font-black text-slate-900">Administrator access required</h1><p className="mt-2 max-w-md text-sm text-slate-600">Sign in with an authorized admin account to open this area.</p><Link href="/admin-login" className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">Go to sign in</Link></>}
    </main>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin-console" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                <BrandLogo className="h-full w-full rounded-[inherit] object-cover" />
              </div>
              <div>
                <span className="font-black text-base text-slate-950">BlankLearn Admin</span>
                <span className="block text-[9px] font-bold text-red-600 uppercase tracking-wider -mt-1 font-mono">
                  Super-Admin Command
                </span>
              </div>
            </Link>

            <nav className="hidden xl:flex items-center gap-5 text-xs font-bold text-slate-600">
              <Link href="/admin-console" className="hover:text-indigo-600">Manage platform</Link>
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
            <button type="button" onClick={async () => { await signOut(auth); document.cookie="__session=; path=/; max-age=0"; window.location.assign("/admin-login"); }} className="text-xs font-bold text-slate-500 hover:text-red-600 px-2 py-1">Logout</button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
