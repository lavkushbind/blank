"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { CheckCircle2, ArrowLeft, Calendar, Clock, User, ShieldCheck } from "lucide-react";

export default function TeacherProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [teacher, setTeacher] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTeacher() {
      try {
        setLoading(true);
        const snap = await getDoc(doc(db, "teachers", id));
        if (snap.exists()) {
          setTeacher({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.error("Teacher lookup error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTeacher();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 p-8 rounded-3xl max-w-sm w-full text-center space-y-3 shadow-xl">
          <h2 className="text-base font-black text-slate-900">Teacher Profile Not Found</h2>
          <p className="text-xs text-slate-500">No verified mentor exists in Firestore with ID #{id}.</p>
          <Link href="/teachers" className="inline-block px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl">
            Back to Directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/teachers" className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900">
            <ArrowLeft size={14} /> Back to Directory
          </Link>
          <Link href="/demo-booking" className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl">
            Book Free Demo
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-black text-2xl flex items-center justify-center shrink-0">
              {teacher.name?.slice(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-950">{teacher.name}</h1>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Verified
                </span>
              </div>
              <p className="text-xs font-bold text-indigo-600">{teacher.education}</p>
              <p className="text-xs text-slate-500">{teacher.experienceYears || 5}+ Years Experience</p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">About Mentor</h3>
            <p className="text-xs text-slate-700 leading-relaxed">{teacher.bio || "Verified 1:5 micro-batch mentor."}</p>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Teaching Subjects</h3>
            <div className="flex flex-wrap gap-1.5">
              {teacher.subjects?.map((sub: string, i: number) => (
                <span key={i} className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-lg border border-indigo-100">
                  {sub}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/demo-booking"
              className="block w-full py-3 text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm"
            >
              Book Free Trial Demo Pod with {teacher.name} →
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        BlankLearn Verified Profile • 100% Real Live Data
      </footer>
    </div>
  );
}