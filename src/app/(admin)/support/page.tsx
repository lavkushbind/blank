"use client";

import React, { useState } from "react";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState([
    { id: "T-1029", name: "Rajesh Sharma", role: "Parent", subject: "Class 8 ICSE Maths timing slots", status: "OPEN", time: "15 mins ago" },
    { id: "T-1028", name: "Ananya Iyer", role: "Parent", subject: "Refund request for monthly pod", status: "OPEN", time: "2 hours ago" },
    { id: "T-1027", name: "Pooja Verma", role: "Teacher", subject: "KYC Aadhaar update issue", status: "RESOLVED", time: "1 day ago" },
  ]);

  const markResolved = (id: string) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: "RESOLVED" } : t));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-slate-950">Helpdesk & Support Operations</h1>
        <p className="text-xs text-slate-500">Manage parent inquiries and teacher support tickets.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Tickets List */}
        <div className="md:col-span-1 space-y-3">
          {tickets.map(t => (
            <div key={t.id} className="bg-white border border-slate-200 p-4 rounded-2xl cursor-pointer hover:border-indigo-300 transition shadow-sm space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-slate-400">{t.id} • {t.time}</span>
                <Badge variant={t.status === "OPEN" ? "destructive" : "success"}>{t.status}</Badge>
              </div>
              <h4 className="font-bold text-slate-900 text-xs">{t.name} ({t.role})</h4>
              <p className="text-[11px] text-slate-500 truncate">{t.subject}</p>
            </div>
          ))}
        </div>

        {/* Ticket Reply View */}
        <div className="md:col-span-2 bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-sm space-y-5">
          <div className="flex justify-between items-start border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">Class 8 ICSE Maths timing slots</h2>
              <p className="text-xs text-slate-500 mt-1">From: Rajesh Sharma (Parent) • +91 9821011111</p>
            </div>
            <Badge variant="destructive">OPEN</Badge>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-xs text-slate-700 leading-relaxed font-medium">
            "Hello, I wanted to know if Rahul Sir has any evening slots available around 7 PM for Class 8 ICSE Mathematics? The current 5 PM slot clashes with my son's football practice."
          </div>

          <div className="space-y-3 pt-4">
            <label className="block text-xs font-bold text-slate-700">Reply via WhatsApp / Email</label>
            <textarea
              rows={4}
              placeholder="Type your official response..."
              className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
            <div className="flex gap-3">
              <button className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm">
                Send Reply
              </button>
              <button onClick={() => markResolved("T-1029")} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl">
                Mark as Resolved ✓
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}