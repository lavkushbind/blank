"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase/client";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { CheckCircle2, DollarSign } from "lucide-react";

export default function AdminPayoutsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPayouts() {
      try {
        setLoading(true);
        const snap = await getDocs(collection(db, "payout_requests"));
        setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error fetching payouts", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPayouts();
  }, []);

  const approvePayout = async (id: string) => {
    try {
      await updateDoc(doc(db, "payout_requests", id), { status: "SETTLED" });
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "SETTLED" } : r));
      alert("Payout marked as SETTLED in Firestore.");
    } catch (err) {
      console.error("Payout approval error:", err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-slate-950">Teacher Bank Settlement Desk</h1>
        <p className="text-xs text-slate-500">Live withdrawal requests submitted by teachers in Firestore.</p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading payout requests...</div>
      ) : requests.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 rounded-3xl text-center space-y-2 max-w-md mx-auto">
          <DollarSign size={28} className="text-slate-400 mx-auto" />
          <h3 className="text-sm font-black text-slate-900">No Payout Requests Pending</h3>
          <p className="text-xs text-slate-500">When teachers request withdrawal on /wallet, requests appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <div key={r.id} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-base font-black text-slate-950">{r.teacherName || "Mentor"}</h3>
                <span className="text-xs text-slate-400 font-mono">Teacher ID: {r.teacherId}</span>
                <p className="text-xl font-black text-emerald-700 font-mono mt-1">₹{r.amount}</p>
              </div>

              {r.status === "PENDING" ? (
                <button
                  onClick={() => approvePayout(r.id)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  Approve NEFT Transfer ✓
                </button>
              ) : (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                  ✓ Settled via Bank Transfer
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}