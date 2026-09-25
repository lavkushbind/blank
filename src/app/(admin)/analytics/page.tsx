"use client";

import { useEffect, useState } from "react";
import { collection, getCountFromServer } from "firebase/firestore";
import { Loader2, RefreshCw, Users, GraduationCap, BookOpen, CalendarDays } from "lucide-react";
import { db } from "@/lib/firebase/client";

const metrics = [
  { key: "students", label: "Student profiles", icon: Users },
  { key: "teachers", label: "Teacher profiles", icon: GraduationCap },
  { key: "batches", label: "Batches", icon: BookOpen },
  { key: "demo_bookings", label: "Demo bookings", icon: CalendarDays },
] as const;

export default function AdminAnalyticsPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const values = await Promise.all(metrics.map(async ({ key }) => [key, (await getCountFromServer(collection(db, key))).data().count] as const));
      setCounts(Object.fromEntries(values));
    } catch (cause) { console.error("Admin analytics counts failed", cause); setError("Usage totals could not be loaded. Check administrator access and Firestore availability."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  return <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6"><header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6"><div><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Platform data</p><h1 className="mt-2 text-2xl font-black text-slate-950">Usage overview</h1><p className="mt-1 text-sm text-slate-600">Live document totals from the platform database. Revenue and conversion are not estimated here.</p></div><button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"><RefreshCw size={15} className={loading ? "animate-spin" : ""}/>Refresh</button></header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading ? <div className="py-16 text-center text-slate-500"><Loader2 className="mx-auto animate-spin"/><p className="mt-3 text-sm">Loading database totals…</p></div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ key, label, icon: Icon }) => <article key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-600">{label}</p><Icon size={18} className="text-indigo-600"/></div><p className="mt-5 text-3xl font-black tabular-nums text-slate-950">{(counts[key] || 0).toLocaleString()}</p><p className="mt-1 text-xs text-slate-400">Current total</p></article>)}</div>}
  </main>;
}
