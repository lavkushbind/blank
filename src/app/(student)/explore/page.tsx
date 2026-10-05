"use client";
import { readApiResponse } from "@/lib/api-response";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { BookOpen, Clock3, Sparkles, Users } from "lucide-react";
import { auth } from "@/lib/firebase/client";

const programs = [
  { id: "ENGLISH_ONLY", title: "English", text: "Build confidence in reading, writing and communication.", subjects: "English", color: "emerald" },
  { id: "MATH_ONLY", title: "Mathematics", text: "Strengthen concepts and solve problems with a teacher.", subjects: "Math", color: "indigo" },
  { id: "ALL_SUBJECTS", title: "Complete learning", text: "A combined learning plan for Math, Science and English.", subjects: "Math · Science · English", color: "violet" },
];

export default function ExploreBatchesPage() {
  return <Suspense fallback={<main className="min-h-screen bg-slate-50" aria-label="Loading classes" />}><ExploreBatchesContent /></Suspense>;
}

function ExploreBatchesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = (searchParams.get("q") || "").trim().toLowerCase();
  const [open, setOpen] = useState(false);
  const [programId, setProgramId] = useState("MATH_ONLY");
  const [classNumber, setClassNumber] = useState("8");
  const [board, setBoard] = useState("CBSE");
  const [preferredTime, setPreferredTime] = useState("Flexible");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [enrolledBatches, setEnrolledBatches] = useState<Array<{ id: string; name: string; subject: string; subjects: string[] }>>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const response = await fetch("/api/student-batches", { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
        const result = await readApiResponse(response);
        if (result.success) setEnrolledBatches(result.batches || []);
      } catch (error) { console.error("Student batches could not be loaded", error); }
    });
    return unsubscribe;
  }, []);

  async function bookDemo(id: string) {
    router.push(`/demo-booking?programId=${id}`);
  }

  async function requestBatch(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const user = auth.currentUser;
      if (!user) { setMessage("Sign in to send a batch request."); return; }
      const response = await fetch("/api/batch-requests", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ programId, classNumber, board, preferredTime, note }) });
      const result = await readApiResponse(response);
      if (!response.ok || !result.success) throw new Error(result.message || "Request could not be sent.");
      setMessage("Request sent. We’ll match it with a suitable batch and contact you."); setOpen(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Request could not be sent."); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-indigo-600">Find your next class</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Explore learning batches</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Small teacher-led groups with up to five learners. Book a demo to find the right class, teacher and time.</p></div><Link href="/hub" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">My dashboard</Link></div>
    <div className="grid gap-5 md:grid-cols-3">{programs.filter((item)=>!searchQuery||`${item.title} ${item.text} ${item.subjects}`.toLowerCase().includes(searchQuery)).map((item) => { const joined = enrolledBatches.some((batch) => (batch.subjects.length ? batch.subjects : [batch.subject]).some((subject) => item.subjects.toLowerCase().includes(subject.toLowerCase())) && item.id !== "ALL_SUBJECTS"); return <article key={item.id} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><BookOpen size={22}/></div><div className="mt-5 flex items-center justify-between gap-2"><h2 className="text-xl font-black text-slate-950">{item.title}</h2>{joined && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">In your classes</span>}</div><p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{item.text}</p><div className="mt-5 flex items-center gap-2 text-xs font-semibold text-slate-500"><Users size={15}/> Small groups <span>·</span> up to 5</div><div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500"><Clock3 size={15}/> 60-minute demo</div><p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">{item.subjects}</p><button onClick={() => void bookDemo(item.id)} className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white transition hover:bg-indigo-700">{joined?"Book another demo":"Book a demo"}</button></article>; })}</div>
    {enrolledBatches.length > 0 && <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6"><p className="text-xs font-black uppercase tracking-[.16em] text-indigo-600">Recommended for you</p><h2 className="mt-2 text-xl font-black text-slate-950">Build on the classes you’ve joined</h2><p className="mt-1 text-sm text-slate-600">We found {enrolledBatches.length} current batch{enrolledBatches.length===1?"":"es"} in your account. Explore another subject or the complete learning plan.</p><div className="mt-4 flex flex-wrap gap-2">{enrolledBatches.map(batch=><span key={batch.id} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">{batch.name}</span>)}</div><button onClick={()=>void bookDemo(enrolledBatches.some(batch=>`${batch.subject} ${batch.subjects.join(" ")}`.toLowerCase().includes("math"))?"ENGLISH_ONLY":"MATH_ONLY")} className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700">Book a demo for another subject</button></section>}
    <section className="mt-7 rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-white p-6 sm:flex sm:items-center sm:justify-between"><div className="flex gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm"><Sparkles size={20}/></div><div><h2 className="font-black text-slate-950">Looking for a different class or time?</h2><p className="mt-1 text-sm text-slate-600">Tell us what works for you. We’ll review your request and suggest a suitable option.</p></div></div><button onClick={() => setOpen(true)} className="mt-4 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white sm:mt-0">Request a batch</button></section>
    {message && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</p>}
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}><form onSubmit={requestBatch} className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 className="text-xl font-black">Request a batch</h2><p className="mt-1 text-sm text-slate-500">Share your class and preferred schedule.</p></div><button type="button" onClick={()=>setOpen(false)} aria-label="Close" className="rounded-lg px-2 py-1 text-slate-500">✕</button></div><label className="block text-xs font-bold text-slate-600">Learning plan<select value={programId} onChange={e=>setProgramId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm">{programs.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-slate-600">Class<select value={classNumber} onChange={e=>setClassNumber(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm">{Array.from({length:12},(_,i)=><option key={i+1}>{i+1}</option>)}</select></label><label className="text-xs font-bold text-slate-600">Board<select value={board} onChange={e=>setBoard(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm">{["CBSE","ICSE","STATE","OTHER"].map(x=><option key={x}>{x}</option>)}</select></label></div><label className="block text-xs font-bold text-slate-600">Preferred time<input value={preferredTime} onChange={e=>setPreferredTime(e.target.value)} maxLength={60} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="e.g. Weekdays after 5 PM"/></label><label className="block text-xs font-bold text-slate-600">Anything else? <span className="font-normal">(optional)</span><textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={500} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Tell us what you’re looking for"/></label><button disabled={busy} className="w-full rounded-xl bg-indigo-600 p-3 font-bold text-white disabled:opacity-60">{busy?"Sending…":"Send request"}</button></form></div>}
  </div></main>;
}
