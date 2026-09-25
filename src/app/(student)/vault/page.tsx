"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { BookOpen, CheckCircle2, FileText, Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase/client";

type Resource = { id: string; title: string; subject: string; status: string; date: string | null; startTime: string | null; summary: string; attendance: string | null; materials: Array<{ name: string; url: string }> };

export default function StudentVaultPage() {
  const [user, setUser] = useState<User | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => onAuthStateChanged(auth, (current) => { setUser(current); if (!current) setLoading(false); }), []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async()=>{try{const response=await fetch("/api/student-vault",{headers:{Authorization:`Bearer ${await user.getIdToken()}`},cache:"no-store"});const data=await response.json();if(!response.ok||!data.success)throw new Error(data.message||"Resources could not be loaded.");if(active)setResources(data.resources||[]);}catch(cause){if(active)setError(cause instanceof Error?cause.message:"Resources could not be loaded.");}finally{if(active)setLoading(false);}})();
    return()=>{active=false;};
  },[user]);
  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">Your learning library</p><h1 className="mt-2 text-3xl font-black text-slate-950">Class Vault</h1><p className="mt-2 text-sm text-slate-600">Lesson notes and PDFs your teacher has shared with your classes.</p>
    {error&&<p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {loading?<div className="py-20 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin"/>Loading your class resources…</div>:resources.length===0?<div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><BookOpen className="mx-auto text-slate-300" size={30}/><h2 className="mt-4 text-base font-black text-slate-900">Your class library is empty</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Materials will show up here after your teacher shares them in a class. You’ll also find class summaries after the teacher submits them.</p></div>:<div className="mt-6 space-y-4">{resources.map(resource=><article key={resource.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-[10px] font-black uppercase tracking-[.14em] text-blue-700">{resource.subject}</span><h2 className="mt-1 text-lg font-black text-slate-950">{resource.title}</h2><p className="mt-1 text-xs text-slate-500">{resource.date?new Date(`${resource.date}T00:00:00`).toLocaleDateString("en-IN",{dateStyle:"medium"}):"Date unavailable"}{resource.startTime?` · ${resource.startTime}`:""}</p></div>{resource.attendance&&<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"><CheckCircle2 size={14}/>{resource.attendance}</span>}</div>{resource.summary&&<div className="mt-4 rounded-2xl bg-slate-50 p-4"><h3 className="text-xs font-black text-slate-800">Teacher’s class summary</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{resource.summary}</p></div>}{resource.materials.length>0&&<div className="mt-4"><h3 className="text-xs font-black text-slate-800">Shared materials</h3><div className="mt-2 flex flex-wrap gap-2">{resource.materials.map((material,index)=><a key={`${material.name}-${index}`} href={material.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-100"><FileText size={15}/>{material.name}</a>)}</div></div>}{!resource.summary&&!resource.materials.length&&<p className="mt-4 text-xs text-slate-400">No notes or materials were attached to this class.</p>}</article>)}</div>}
  </main>;
}
