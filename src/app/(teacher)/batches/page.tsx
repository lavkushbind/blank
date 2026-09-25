"use client";

import React, { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Users, Clock, ArrowRight, BookOpen } from "lucide-react";

export default function TeacherBatchesPage() {
  return <Suspense fallback={<main className="min-h-screen bg-slate-50" aria-label="Loading batches" />}><TeacherBatchesContent /></Suspense>;
}

function TeacherBatchesContent() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = (searchParams.get("q") || "").toLowerCase();

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/teacher-auth"); return; }
      try {
        setLoading(true);
        const q = query(collection(db, "batches"), where("teacherId", "==", user.uid));
        const snap = await getDocs(q);
        if (active) setBatches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Batches load error:", err);
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => { active = false; unsubscribe(); };
  }, [router]);

  const visibleBatches = batches.filter((batch) => `${batch.name || ""} ${batch.subject || ""} ${batch.grade || ""} ${batch.board || ""}`.toLowerCase().includes(searchQuery));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-slate-950">My batches</h1>
        <p className="text-xs text-slate-500">Your assigned learning groups, student counts and schedules.</p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500">Fetching batches...</div>
      ) : visibleBatches.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 rounded-3xl text-center space-y-2 shadow-sm max-w-md mx-auto">
          <BookOpen size={28} className="text-slate-400 mx-auto" />
          <h3 className="text-base font-black text-slate-900">{searchQuery ? "No matching batches" : "No batches assigned"}</h3>
          <p className="text-xs text-slate-500">{searchQuery ? "Try a different name, class or subject." : "Assigned batches will appear here with their students and schedule."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {visibleBatches.map((b) => (
            <div key={b.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                    #{b.id}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {(b.studentIds || []).length}/{b.capacity || 5} Students
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900">{b.name}</h3>
                <p className="text-xs text-slate-500">{b.grade} • {b.subject}</p>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium pt-1">
                  <Clock size={13} /> {b.timeSlot || "Scheduled Evening"}
                </div>
              </div>

              <Link
                href={`/batches/${b.id}`}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl text-center block"
              >
                Launch Studio →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
