"use client";

import React, { use } from "react";
import Link from "next/link";
import { ArrowLeft, PhoneCall, CheckCircle2, Video } from "lucide-react";

export default function SingleBatchDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const students = [
    { id: "s1", name: "Aarav Sharma", parentPhone: "+91 98210 11111", attendance: "96%", avgScore: "88%", status: "Active" },
    { id: "s2", name: "Riya Verma", parentPhone: "+91 98210 22222", attendance: "92%", avgScore: "84%", status: "Active" },
    { id: "s3", name: "Kabir Mehta", parentPhone: "+91 98210 33333", attendance: "90%", avgScore: "78%", status: "Active" },
    { id: "s4", name: "Ananya Iyer", parentPhone: "+91 98210 44444", attendance: "98%", avgScore: "92%", status: "Active" },
    { id: "s5", name: "Vihaan Patel", parentPhone: "+91 98210 55555", attendance: "88%", avgScore: "80%", status: "Active" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <Link href="/batches" className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 mb-2">
            <ArrowLeft size={14} /> Back to All Batches
          </Link>
          <h1 className="text-2xl font-black text-slate-950">Batch #{id} • 5-Student Pod Roster</h1>
          <p className="text-xs text-slate-500">Every student attends with camera and microphone active.</p>
        </div>

        <Link
          href={`/studio/${id}`}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2"
        >
          <Video size={16} /> Enter Live Studio for #{id}
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-sm font-black text-slate-900">Enrolled Students (Strict 1:5 Capacity)</h3>
          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
            5/5 Seats Filled
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {students.map((s, idx) => (
            <div key={s.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 font-black text-sm flex items-center justify-center">
                  #{idx + 1}
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">{s.name}</h4>
                  <p className="text-[11px] text-slate-500">Parent: {s.parentPhone}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-slate-600 font-medium">
                <div>
                  <span className="block text-[10px] text-slate-400">Attendance</span>
                  <span className="font-bold text-slate-900">{s.attendance}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">Quiz Average</span>
                  <span className="font-bold text-indigo-600">{s.avgScore}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">Status</span>
                  <span className="font-bold text-emerald-700">{s.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}