"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Eye, Loader2, Radio, RefreshCw } from "lucide-react";
import { db } from "@/lib/firebase/client";

type LiveSession = { id: string; title: string; subject: string; teacherId: string; studentCount: number; startedAt: string | null };

export default function AdminLiveRadarPage() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const snap = await getDocs(query(collection(db, "class_sessions"), where("status", "==", "LIVE")));
      setSessions(snap.docs.map((doc) => { const data = doc.data(); return { id: doc.id, title: data.title || data.name || "Live class", subject: data.subject || "Subject not set", teacherId: data.teacherId || "", studentCount: Array.isArray(data.studentIds) ? data.studentIds.length : 0, startedAt: data.startedAt?.toDate?.()?.toISOString?.() || null }; }));
    } catch (cause) { console.error("Live session list failed", cause); setError("Live classes could not be loaded."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  return <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6"><header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-700"><Radio size={14}/> Live sessions</p><h1 className="mt-2 text-2xl font-black text-slate-950">Classroom monitor</h1><p className="mt-1 text-sm text-slate-600">Sessions currently marked live in the class system.</p></div><button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"><RefreshCw size={15} className={loading ? "animate-spin" : ""}/>Refresh</button></header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading ? <div className="py-16 text-center text-slate-500"><Loader2 className="mx-auto animate-spin"/><p className="mt-3 text-sm">Loading live sessions…</p></div> : sessions.length ? <div className="space-y-3">{sessions.map((session) => <article key={session.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div><div className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"/><h2 className="font-black text-slate-900">{session.title}</h2></div><p className="mt-1 text-sm text-slate-600">{session.subject} · {session.studentCount} student{session.studentCount === 1 ? "" : "s"}{session.teacherId && ` · Teacher ${session.teacherId}`}</p><p className="mt-1 text-xs text-slate-400">{session.startedAt ? `Started ${new Date(session.startedAt).toLocaleString()}` : "Start time not recorded"}</p></div><Link href={`/classroom/${encodeURIComponent(session.id)}`} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white"><Eye size={14}/>Open session</Link></article>)}</div> : <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><Radio className="mx-auto text-slate-300" size={32}/><h2 className="mt-3 font-bold text-slate-800">No live sessions</h2><p className="mt-1 text-sm text-slate-500">When a teacher starts a class, it will appear here.</p></div>}
  </main>;
}
