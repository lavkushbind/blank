"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Users, ChevronDown, CheckCircle2 } from "lucide-react";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const [activeChild, setActiveChild] = useState("Aarav (Class 7, CBSE)");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/report/batch-demo-101" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
                BL
              </div>
              <div>
                <span className="font-black text-base tracking-tight text-slate-950">BlankLearn Parent</span>
                <span className="block text-[9px] font-bold text-indigo-600 uppercase tracking-wider -mt-1">
                  The Proof Hub
                </span>
              </div>
            </Link>

            {/* Sibling Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 transition"
              >
                <span>🧒 {activeChild}</span>
                <ChevronDown size={14} className="text-slate-500" />
              </button>

              {dropdownOpen && (
                <div className="absolute top-10 left-0 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 space-y-1">
                  <div
                    onClick={() => { setActiveChild("Aarav (Class 7, CBSE)"); setDropdownOpen(false); }}
                    className="p-2 text-xs font-bold text-slate-800 hover:bg-indigo-50 rounded-xl cursor-pointer flex justify-between items-center"
                  >
                    <span>Aarav (Class 7, CBSE)</span>
                    {activeChild.startsWith("Aarav") && <CheckCircle2 size={14} className="text-indigo-600" />}
                  </div>
                  <div
                    onClick={() => { setActiveChild("Ananya (Class 9, ICSE)"); setDropdownOpen(false); }}
                    className="p-2 text-xs font-bold text-slate-800 hover:bg-indigo-50 rounded-xl cursor-pointer flex justify-between items-center"
                  >
                    <span>Ananya (Class 9, ICSE)</span>
                    {activeChild.startsWith("Ananya") && <CheckCircle2 size={14} className="text-indigo-600" />}
                  </div>
                </div>
              )}
            </div>

            <nav className="hidden md:flex items-center gap-5 text-xs font-bold text-slate-600">
              <Link href="/report/batch-demo-101" className="hover:text-indigo-600 transition">Diagnostic Proof</Link>
              <Link href="/syllabus" className="hover:text-indigo-600 transition">Syllabus Tracker</Link>
              <Link href="/billing" className="hover:text-indigo-600 transition">Billing & Renewal</Link>
              <Link href="/invoices" className="hover:text-indigo-600 transition">GST Invoices</Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/billing"
              className="px-3.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl hover:bg-emerald-100 transition"
            >
              Seat Reserved (Active)
            </Link>

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