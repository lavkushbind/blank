"use client";

import React from "react";
import { Download, FileText } from "lucide-react";

export default function ParentInvoicesPage() {
  const invoices = [
    { id: "INV-2026-0891", date: "20 August 2026", desc: "Monthly 1:5 Pod (Mathematics & Science)", amount: "₹3,049", gst: "₹450 Off (Coins)" },
    { id: "INV-2026-0742", date: "20 July 2026", desc: "Monthly 1:5 Pod (Mathematics & Science)", amount: "₹3,499", gst: "₹0 Discount" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-950">GST Tax Invoices</h1>
        <p className="text-xs text-slate-500">Download official tax receipts for tuition fee claims and records.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-100 text-xs">
          {invoices.map((inv) => (
            <div key={inv.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900">{inv.id}</h4>
                  <p className="text-[11px] text-slate-500">{inv.desc} • {inv.date}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="font-black text-slate-900 font-mono text-sm">{inv.amount}</span>
                  <span className="block text-[10px] text-emerald-700 font-semibold">{inv.gst}</span>
                </div>
                <button
                  onClick={() => alert(`Downloading GST Invoice ${inv.id}...`)}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-200"
                  title="Download PDF"
                >
                  <Download size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}