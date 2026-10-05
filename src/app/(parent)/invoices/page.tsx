"use client";
import { readApiResponse } from "@/lib/api-response";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { FileText, Loader2, ReceiptText } from "lucide-react";
import { auth } from "@/lib/firebase/client";

type Payment = { id: string; bookingId: string | null; amount: number; currency: string; type: string; planType: string | null; status: string; paymentId: string | null; createdAt: string | null };

export default function ParentInvoicesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState("");
  useEffect(() => onAuthStateChanged(auth, (current) => { setUser(current); setReady(true); }), []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/student-payments", { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
        const result = await readApiResponse(response);
        if (!response.ok || !result.success) throw new Error(result.message || "Payment history could not be loaded.");
        if (active) setPayments(result.payments || []);
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Payment history could not be loaded."); }
    })();
    return () => { active = false; };
  }, [user]);
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6"><header><p className="text-xs font-black uppercase tracking-widest text-indigo-600">Account</p><h1 className="mt-2 text-2xl font-black text-slate-950">Payment history</h1><p className="mt-1 text-sm text-slate-600">Payments recorded for your signed-in student account.</p></header>{error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}{!ready ? <div className="py-12 text-center"><Loader2 className="mx-auto animate-spin text-indigo-600"/></div> : !user ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Sign in to view your payment history.</p> : payments.length === 0 && !error ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><ReceiptText className="mx-auto text-slate-300" size={32}/><h2 className="mt-3 font-bold text-slate-800">No payments recorded</h2><p className="mt-1 text-sm text-slate-500">Completed and pending checkout records will appear here.</p></div> : <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="divide-y divide-slate-100">{payments.map((payment) => <article key={payment.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><FileText size={18}/></div><div><h2 className="text-sm font-bold text-slate-900">{payment.type === "COURSE_PURCHASE" ? `${payment.planType || "Course"} enrollment` : "Demo booking"}</h2><p className="mt-1 text-xs text-slate-500">Order {payment.id}{payment.paymentId ? ` · Payment ${payment.paymentId}` : ""}</p><p className="mt-1 text-xs text-slate-400">{payment.createdAt ? new Date(payment.createdAt).toLocaleString() : "Date unavailable"}</p></div></div><div className="text-right"><p className="font-mono text-lg font-black text-slate-900">{new Intl.NumberFormat("en-IN", { style: "currency", currency: payment.currency }).format(payment.amount)}</p><p className="text-xs font-bold text-slate-500">{payment.status}</p></div></article>)}</div></div>}</main>;
}
