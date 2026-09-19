"use client";

import React, { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase/client";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { Wallet, ArrowUpRight, CheckCircle2 } from "lucide-react";

export default function TeacherWalletPage() {
  const [ledger, setLedger] = useState<any[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [withdrawing, setWithdrawing] = useState<boolean>(false);
  const [withdrawnSuccess, setWithdrawnSuccess] = useState<boolean>(false);
  const user = auth.currentUser;

  useEffect(() => {
    async function loadLedger() {
      try {
        const teacherUid = user ? user.uid : "teacher_current";
        const q = query(collection(db, "teacher_ledger"), where("teacherId", "==", teacherUid));
        const snap = await getDocs(q);
        const list: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setLedger(list);

        const total = list.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);
        setBalance(total);
      } catch (err) {
        console.error("Ledger fetch error", err);
      }
    }
    loadLedger();
  }, [user]);

  const requestWithdrawal = async () => {
    if (balance <= 0) {
      alert("No available balance to withdraw.");
      return;
    }
    try {
      setWithdrawing(true);
      const teacherUid = user ? user.uid : "teacher_current";
      await addDoc(collection(db, "payout_requests"), {
        teacherId: teacherUid,
        teacherName: user?.displayName || "Mentor",
        amount: balance,
        status: "PENDING",
        createdAt: serverTimestamp(),
      });
      setWithdrawnSuccess(true);
    } catch (err) {
      console.error("Withdrawal error:", err);
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-950">Earnings & Payouts Ledger</h1>
          <p className="text-xs text-slate-500">Real-time ledger of completed classes from Firestore.</p>
        </div>

        <button
          onClick={requestWithdrawal}
          disabled={withdrawing || withdrawnSuccess || balance <= 0}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
        >
          <ArrowUpRight size={15} /> {withdrawnSuccess ? "Withdrawal Requested ✓" : `Withdraw ₹${balance}`}
        </button>
      </div>

      {withdrawnSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-900">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>Withdrawal request of ₹{balance} recorded in Firestore. Payout will be reviewed by admin.</span>
        </div>
      )}

      {/* Balance Card */}
      <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex justify-between items-center">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available Balance</span>
          <p className="text-3xl font-black text-slate-950 font-mono mt-1">₹{balance}</p>
        </div>
        <div className="text-right text-xs">
          <span className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full font-mono">
            Rate: ₹650 / 1:5 Class
          </span>
        </div>
      </div>

      {/* Ledger */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 font-black text-xs text-slate-900">
          Transaction History ({ledger.length})
        </div>
        {ledger.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No class earnings recorded in database yet.</div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {ledger.map((tx) => (
              <div key={tx.id} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-900">{tx.description || "Completed 1:5 Class"}</p>
                  <span className="text-[10px] text-slate-400 font-mono">Batch: #{tx.batchId}</span>
                </div>
                <span className="font-mono font-black text-emerald-700">+₹{tx.amount}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}