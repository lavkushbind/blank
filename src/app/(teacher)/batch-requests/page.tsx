"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, MessageSquareText, Users } from "lucide-react";
import { auth } from "@/lib/firebase/client";

type RequestRow = { id: string; studentName: string; programName: string; subjects: string[]; classNumber: number; board: string; preferredTime: string; note?: string; createdAt?: string };

export default function TeacherBatchRequestsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => onAuthStateChanged(auth, (current) => { setUser(current); if (!current) setLoading(false); }), []);
  async function load(current: User) {
    setLoading(true);
    try {
      const response = await fetch("/api/batch-requests", { headers: { Authorization: `Bearer ${await current.getIdToken()}` }, cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Requests could not be loaded.");
      setRows(result.requests || []); setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Requests could not be loaded."); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (user) void load(user); }, [user]);
  async function review(row: RequestRow) {
    if (!user) return;
    setWorking(row.id); setMessage("");
    try {
      const response = await fetch(`/api/batch-requests/${encodeURIComponent(row.id)}`, { method: "PATCH", headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not take this request.");
      setRows((current) => current.filter((item) => item.id !== row.id));
      if (result.studentId) router.push(`/teacher-chat/${encodeURIComponent(result.studentId)}`);
      else setMessage(`You’re now reviewing ${row.studentName}’s request.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not take this request."); }
    finally { setWorking(""); }
  }
  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><p className="text-xs font-black uppercase tracking-[.2em] text-indigo-600">Student demand</p><h1 className="mt-2 text-3xl font-black text-slate-950">Batch requests</h1><p className="mt-2 text-sm text-slate-600">Requests matching your subjects and class range.</p>
    {message && <p role="status" className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-800">{message}</p>}
    {loading ? <div className="flex justify-center py-20 text-slate-500"><Loader2 className="animate-spin"/></div> : rows.length === 0 ? <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><Users className="mx-auto text-slate-300" size={30}/><h2 className="mt-4 font-black text-slate-900">No matching requests yet</h2><p className="mt-2 text-sm text-slate-500">New student requests for subjects and grades you teach will appear here.</p></div> : <div className="mt-6 grid gap-4 md:grid-cols-2">{rows.map((row)=><article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-black text-slate-950">{row.programName}</h2><p className="mt-1 text-sm text-slate-600">{row.studentName} · Class {row.classNumber} · {row.board}</p></div><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">New</span></div><div className="mt-4 flex flex-wrap gap-2">{row.subjects?.map((subject)=><span key={subject} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{subject}</span>)}</div><p className="mt-4 flex items-center gap-2 text-sm text-slate-600"><CalendarClock size={16}/>{row.preferredTime || "Flexible schedule"}</p>{row.note && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{row.note}</p>}<button disabled={!!working} onClick={()=>void review(row)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">{working===row.id?<Loader2 size={16} className="animate-spin"/>:<MessageSquareText size={16}/>}Review request</button></article>)}</div>}
  </main>;
}
