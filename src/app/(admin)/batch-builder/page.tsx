"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase/client";
import { collection, getDocs, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { Users, PlusCircle, CheckCircle2 } from "lucide-react";

export default function AdminBatchBuilderPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [bSnap, wSnap] = await Promise.all([
          getDocs(collection(db, "batches")),
          getDocs(collection(db, "waitlist")),
        ]);
        setBatches(bSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setWaitlist(wSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Matchmaker data load error", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const assignStudentToPod = async (batchId: string, studentDocId: string, studentName: string) => {
    try {
      // 1. Add student to Firestore Batch (Strict 1:5 constraint)
      await updateDoc(doc(db, "batches", batchId), {
        studentIds: arrayUnion(studentDocId),
      });

      // 2. Mark waitlist doc as ENROLLED
      await updateDoc(doc(db, "waitlist", studentDocId), {
        status: "ENROLLED",
        batchId: batchId,
      });

      alert(`Student ${studentName} allocated to 1:5 Pod #${batchId} in Firestore.`);
      // Refresh local state
      setBatches(prev => prev.map(b => b.id === batchId ? { ...b, studentIds: [...(b.studentIds || []), studentDocId] } : b));
      setWaitlist(prev => prev.filter(w => w.id !== studentDocId));
    } catch (err) {
      console.error("Allocation error:", err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-slate-950">1:5 Batch Matchmaking Engine</h1>
        <p className="text-xs text-slate-500">Algorithmic allocation: Assign waitlisted students into strict 5-student pods.</p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading pods and waitlist from Firestore...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {batches.map((pod) => {
            const currentCount = pod.studentIds?.length || 0;
            const isFull = currentCount >= 5;

            return (
              <div key={pod.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-black text-slate-900">{pod.name}</h3>
                    <p className="text-xs text-slate-500">{pod.grade} • {pod.subject}</p>
                    <p className="text-xs font-bold text-indigo-600 mt-1">Mentor: {pod.teacherName}</p>
                  </div>
                  <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
                    isFull ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}>
                    {currentCount}/5 Seats
                  </span>
                </div>

                {/* Visual 5-Slot Bar */}
                <div className="grid grid-cols-5 gap-2 h-2.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-full transition ${i < currentCount ? "bg-indigo-600" : "bg-slate-200"}`}
                    />
                  ))}
                </div>

                {!isFull && waitlist.length > 0 ? (
                  <button
                    onClick={() => assignStudentToPod(pod.id, waitlist[0].id, waitlist[0].name || "Waitlist Student")}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle size={15} /> Assign Next Waitlist Student ({waitlist[0].name || "Student"})
                  </button>
                ) : isFull ? (
                  <div className="p-2.5 bg-slate-50 text-center text-xs font-bold text-slate-500 rounded-xl border border-slate-200">
                    ✓ Pod Locked (Maximum 5/5 Capacity)
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-50 text-center text-xs text-slate-400 rounded-xl">
                    No matching students on waitlist currently.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}