"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Video, BookOpen, Clock, ChevronRight, DollarSign, Users } from "lucide-react";

export default function SaaSTeacherDashboard() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const teacherUid = auth.currentUser ? auth.currentUser.uid : "teacher_current";
        const q = query(collection(db, "batches"), where("teacherId", "==", teacherUid));
        const snap = await getDocs(q);
        setBatches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {} finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* 1. Executive Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-200 pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-zinc-900">
            Mentor Workspace
          </h1>
          <p className="text-sm text-zinc-500">Good afternoon, {auth.currentUser?.displayName || "Rahul Sharma"}. Here is your schedule for today.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/studio/batch-101" className="saas-button bg-indigo-600 hover:bg-indigo-700 text-white border-transparent">
            <Video size={16} /> Enter Next Studio
          </Link>
        </div>
      </div>

      {/* 2. Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="saas-card p-6 space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Scheduled Today</span>
            <Clock size={16} />
          </div>
          <p className="text-3xl font-extrabold text-zinc-900 tracking-tight">5 Pods</p>
        </div>
        <div className="saas-card p-6 space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Students</span>
            <Users size={16} />
          </div>
          <p className="text-3xl font-extrabold text-zinc-900 tracking-tight">22</p>
        </div>
        <div className="saas-card p-6 space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Estimated Payout</span>
            <DollarSign size={16} />
          </div>
          <p className="text-3xl font-extrabold text-zinc-900 tracking-tight">₹28,600</p>
        </div>
      </div>

      {/* 3. Schedule & Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Classes Table */}
        <div className="lg:col-span-2 saas-card overflow-hidden">
          <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
            <h2 className="text-base font-bold text-zinc-900">Today's Schedule</h2>
            <span className="text-xs font-medium text-zinc-500">September 20, 2026</span>
          </div>
          
          <div className="divide-y divide-zinc-100">
            {[
              { id: "101", name: "Class 7 Mathematics", time: "05:00 PM - 06:00 PM", status: "Starting soon" },
              { id: "102", name: "Class 8 Mathematics", time: "06:15 PM - 07:15 PM", status: "Scheduled" },
              { id: "103", name: "Demo Pod - Class 7", time: "07:30 PM - 08:30 PM", status: "New Students" },
            ].map((cls, idx) => (
              <div key={idx} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/50 transition-colors">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">{cls.name}</h4>
                  <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                    <Clock size={12} /> {cls.time}
                    <span className="text-zinc-300">•</span>
                    <span className={idx === 0 ? "text-indigo-600 font-medium" : ""}>{cls.status}</span>
                  </div>
                </div>
                <Link href={`/studio/${cls.id}`} className="saas-button-outline text-xs py-1.5 px-4 h-auto">
                  Open Studio
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Action Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="saas-card p-6">
            <h3 className="text-sm font-bold text-zinc-900 mb-4">Pending Tasks</h3>
            <div className="space-y-4">
              <Link href="/review-homework" className="flex items-start justify-between group">
                <div>
                  <p className="text-sm font-medium text-zinc-900 group-hover:underline">Review Homework</p>
                  <p className="text-xs text-zinc-500 mt-0.5">8 submissions pending</p>
                </div>
                <ChevronRight size={16} className="text-zinc-400 group-hover:text-zinc-900 transition-colors" />
              </Link>
              <div className="w-full h-px bg-zinc-100" />
              <Link href="/wallet" className="flex items-start justify-between group">
                <div>
                  <p className="text-sm font-medium text-zinc-900 group-hover:underline">Approve Withdrawal</p>
                  <p className="text-xs text-zinc-500 mt-0.5">₹28,600 ready for settlement</p>
                </div>
                <ChevronRight size={16} className="text-zinc-400 group-hover:text-zinc-900 transition-colors" />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}