"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { PlayCircle, Clock, BookOpen, PenTool, CheckCircle2, ChevronRight, TrendingUp } from "lucide-react";

export default function SaaSStudentHub() {
  const [student, setStudent] = useState<any>(null);
  const [batch, setBatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const uid = auth.currentUser ? auth.currentUser.uid : "std_current";
        const sDoc = await getDoc(doc(db, "students", uid));
        if (sDoc.exists()) {
          setStudent(sDoc.data());
          if (sDoc.data().currentBatchId) {
            const bDoc = await getDoc(doc(db, "batches", sDoc.data().currentBatchId));
            if (bDoc.exists()) setBatch({ id: bDoc.id, ...bDoc.data() });
          }
        }
      } catch (err) {} finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      {/* 1. Header & Greeting */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-200 pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-zinc-900">
            Overview
          </h1>
          <p className="text-sm text-zinc-500">Welcome back, {auth.currentUser?.displayName || student?.name || "Aarav"}. Here is your academic snapshot.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Total Coins</span>
            <span className="text-lg font-bold tracking-tight text-zinc-900">{student?.coins || 450}</span>
          </div>
          <div className="w-px h-8 bg-zinc-200" />
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Current Streak</span>
            <span className="text-lg font-bold tracking-tight text-zinc-900">{student?.streakDays || 7} Days</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* 2. Main Live Class Card (Left 2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="saas-card overflow-hidden">
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex justify-between items-center">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-xs font-semibold text-zinc-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Next
                </div>
                <span className="text-sm font-medium text-zinc-500">Today, 05:00 PM</span>
              </div>
              
              <div className="space-y-1">
                <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900">Linear Equations</h2>
                <p className="text-base text-zinc-500 font-medium">Mathematics • {batch?.teacherName || "Rahul Sharma"}</p>
              </div>

              <div className="pt-2">
                <Link href={`/classroom/${batch?.id || "batch-demo-101"}`} className="saas-button w-full sm:w-auto px-8 py-6 text-base">
                  <PlayCircle size={18} /> Join Classroom Workspace
                </Link>
              </div>
            </div>
            <div className="bg-zinc-50 border-t border-zinc-100 px-8 py-4 flex items-center justify-between text-sm text-zinc-500">
              <span>Class 7 • CBSE Curriculum</span>
              <span className="font-semibold text-zinc-900">Max 5 Students</span>
            </div>
          </div>

          {/* Academic Progress Matrix */}
          <div className="saas-card p-6 sm:p-8 space-y-6">
            <h3 className="text-base font-bold tracking-tight text-zinc-900 flex items-center gap-2">
              <TrendingUp size={16} className="text-zinc-400" /> Syllabus Progress
            </h3>
            <div className="space-y-5">
              {[
                { subject: "Mathematics", progress: 84 },
                { subject: "Science", progress: 62 },
                { subject: "English", progress: 91 },
              ].map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-sm font-medium text-zinc-700">
                    <span>{item.subject}</span>
                    <span>{item.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-900 rounded-full transition-all" style={{ width: `${item.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Action Sidebar (Right Column) */}
        <div className="lg:col-span-1 space-y-4">
          
          <Link href="/quiz/daily" className="group block saas-card p-5 hover:border-zinc-900 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center">
                <PenTool size={18} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Action Required</span>
            </div>
            <h4 className="font-bold text-zinc-900">Daily Micro-Quiz</h4>
            <p className="text-xs text-zinc-500 mt-1">Complete today's 5 questions to earn coins.</p>
            <div className="mt-4 flex items-center text-xs font-semibold text-zinc-900 group-hover:underline">
              Start Quiz <ChevronRight size={14} className="ml-1 opacity-50" />
            </div>
          </Link>

          <Link href="/homework" className="group block saas-card p-5 hover:border-zinc-900 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center">
                <CheckCircle2 size={18} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Pending</span>
            </div>
            <h4 className="font-bold text-zinc-900">Algebra Assignment</h4>
            <p className="text-xs text-zinc-500 mt-1">Due tomorrow. Upload notebook snap.</p>
            <div className="mt-4 flex items-center text-xs font-semibold text-zinc-900 group-hover:underline">
              Submit Work <ChevronRight size={14} className="ml-1 opacity-50" />
            </div>
          </Link>

          <div className="saas-card p-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4">Your Pod Peers</h4>
            <div className="space-y-3">
              {["Riya Verma", "Kabir Mehta", "Ananya Iyer", "Vihaan Patel"].map((peer, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600 flex items-center justify-center text-xs font-bold">
                    {peer.slice(0, 1)}
                  </div>
                  <span className="text-sm font-medium text-zinc-700">{peer}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}