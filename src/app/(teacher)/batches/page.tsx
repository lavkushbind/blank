"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Users, Clock, ArrowRight, BookOpen } from "lucide-react";

export default function TeacherBatchesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    async function fetchBatches() {
      try {
        setLoading(true);
        const teacherUid = user ? user.uid : "teacher_current";
        const q = query(collection(db, "batches"), where("teacherId", "==", teacherUid));
        const snap = await getDocs(q);
        setBatches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Batches load error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBatches();
  }, [user]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-slate-950">Assigned 1:5 Batches</h1>
        <p className="text-xs text-slate-500">Live pods allocated to your schedule from Firestore.</p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500">Fetching batches...</div>
      ) : batches.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 rounded-3xl text-center space-y-2 shadow-sm max-w-md mx-auto">
          <BookOpen size={28} className="text-slate-400 mx-auto" />
          <h3 className="text-base font-black text-slate-900">No Batches Assigned</h3>
          <p className="text-xs text-slate-500">You currently have no active 1:5 pods in the database.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {batches.map((b) => (
            <div key={b.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                    #{b.id}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {b.studentIds?.length || 0}/5 Seats
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900">{b.name}</h3>
                <p className="text-xs text-slate-500">{b.grade} • {b.subject}</p>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium pt-1">
                  <Clock size={13} /> {b.timeSlot || "Scheduled Evening"}
                </div>
              </div>

              <Link
                href={`/studio/${b.id}`}
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