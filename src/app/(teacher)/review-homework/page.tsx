"use client";

import { useEffect, useState, type FormEvent } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { CheckCircle2, FileText, Loader2, Paperclip } from "lucide-react";
import { auth } from "@/lib/firebase/client";

type Submission = { id: string; studentId: string; studentName: string; taskTitle: string; batchName?: string; contentNotes?: string; attachmentUrl?: string | null; attachmentName?: string; status: string; marksObtained?: number; teacherFeedback?: string; submittedAt?: string };

export default function TeacherHomeworkReviewPage() {
  const [user, setUser] = useState<User | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [marks, setMarks] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const selected = submissions.find((item)=>item.id===selectedId) || null;

  useEffect(() => onAuthStateChanged(auth, (current) => { setUser(current); if (!current) setLoading(false); }), []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async()=>{setLoading(true);setError("");try{const response=await fetch("/api/homework/submissions",{headers:{Authorization:`Bearer ${await user.getIdToken()}`},cache:"no-store"});const data=await response.json();if(!response.ok||!data.success)throw new Error(data.message||"Homework could not be loaded.");const rows:Submission[]=data.submissions||[];if(active){setSubmissions(rows);setSelectedId((current)=>rows.some(item=>item.id===current)?current:rows[0]?.id||"");}}catch(cause){if(active)setError(cause instanceof Error?cause.message:"Homework could not be loaded.");}finally{if(active)setLoading(false);}})();
    return()=>{active=false;};
  },[user]);
  useEffect(()=>{setMarks(selected?.marksObtained===undefined?"":String(selected.marksObtained));setFeedback(selected?.teacherFeedback||"");},[selectedId,selected?.marksObtained,selected?.teacherFeedback]);

  async function grade(event:FormEvent){event.preventDefault();if(!user||!selected)return;setSaving(true);setError("");setSuccess("");try{const response=await fetch(`/api/homework/submissions/${encodeURIComponent(selected.id)}`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${await user.getIdToken()}`},body:JSON.stringify({marksObtained:marks,teacherFeedback:feedback})});const data=await response.json();if(!response.ok||!data.success)throw new Error(data.message||"Feedback could not be saved.");setSubmissions(current=>current.map(item=>item.id===selected.id?{...item,marksObtained:Number(marks),teacherFeedback:feedback,status:"GRADED"}:item));setSuccess("Score and feedback saved for this student.");}catch(cause){setError(cause instanceof Error?cause.message:"Feedback could not be saved.");}finally{setSaving(false);}}

  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">Teaching workspace</p><h1 className="mt-2 text-3xl font-black text-slate-950">Homework review</h1><p className="mt-2 text-sm text-slate-600">Review work submitted by students in your assigned batches.</p>
    {error&&<p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{success&&<p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
    {loading?<div className="py-20 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin"/>Loading assigned submissions…</div>:submissions.length===0?<div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><FileText className="mx-auto text-slate-300" size={30}/><h2 className="mt-4 font-black text-slate-900">No submissions to review</h2><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Student work for your batches will appear here. Submissions from other teachers are not shown.</p></div>:<div className="mt-6 grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><section className="space-y-2">{submissions.map((submission)=><button type="button" key={submission.id} onClick={()=>{setSelectedId(submission.id);setSuccess("");}} className={`w-full rounded-2xl border p-4 text-left transition ${selectedId===submission.id?"border-blue-300 bg-blue-50 shadow-sm":"border-slate-200 bg-white hover:border-blue-200"}`}><span className="flex items-start justify-between gap-3"><span className="min-w-0"><strong className="block truncate text-sm text-slate-900">{submission.studentName||"Student"}</strong><span className="mt-1 block truncate text-xs text-slate-600">{submission.taskTitle}</span></span><span className={`rounded-full px-2 py-1 text-[9px] font-black ${submission.status==="GRADED"?"bg-emerald-100 text-emerald-800":"bg-amber-100 text-amber-800"}`}>{submission.status}</span></span><span className="mt-2 block text-[10px] text-slate-400">{submission.batchName||"Assigned batch"}{submission.submittedAt?` · ${new Date(submission.submittedAt).toLocaleString("en-IN")}`:""}</span></button>)}</section>
      {selected&&<section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="border-b border-slate-100 pb-4"><p className="text-xs font-bold text-blue-700">{selected.batchName||"Assigned batch"}</p><h2 className="mt-1 text-lg font-black text-slate-950">{selected.taskTitle}</h2><p className="mt-1 text-xs text-slate-500">Submitted by {selected.studentName||"Student"}</p></div><div className="mt-4 min-h-24 rounded-2xl bg-slate-50 p-4"><p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{selected.contentNotes||"No written notes attached."}</p></div>{selected.attachmentUrl&&<a href={selected.attachmentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"><Paperclip size={14}/>{selected.attachmentName||"Open attachment"}</a>}<form onSubmit={grade} className="mt-5 space-y-4"><div className="grid gap-4 sm:grid-cols-[140px_1fr]"><label className="text-xs font-bold text-slate-700">Score / 10<input type="number" min="0" max="10" step="0.5" required value={marks} onChange={event=>setMarks(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label><label className="text-xs font-bold text-slate-700">Teacher feedback<input required maxLength={2000} value={feedback} onChange={event=>setFeedback(event.target.value)} placeholder="Add clear, helpful feedback" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label></div><button disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">{saving?<Loader2 size={16} className="animate-spin"/>:<CheckCircle2 size={16}/>}Save score and feedback</button></form></section>}</div>}
  </main>;
}
