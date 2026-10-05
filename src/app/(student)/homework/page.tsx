"use client";
import { readApiResponse } from "@/lib/api-response";

import { useEffect, useState, type FormEvent } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { CheckCircle2, Clock3, FileText, Loader2, UploadCloud } from "lucide-react";
import { auth } from "@/lib/firebase/client";

type Batch = { id: string; name: string; subject?: string };
type Submission = {
  id: string; taskTitle: string; batchName?: string; contentNotes?: string;
  status: string; marksObtained?: number; teacherFeedback?: string;
  submittedAt?: string; attachmentUrl?: string | null; attachmentName?: string;
};

export default function StudentHomeworkPage() {
  const [user, setUser] = useState<User | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [batchId, setBatchId] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [notesText, setNotesText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => onAuthStateChanged(auth, (current) => {
    setUser(current);
    if (!current) setLoading(false);
  }), []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const token = await user.getIdToken();
        const [batchResponse, submissionResponse] = await Promise.all([
          fetch("/api/student-batches", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
          fetch("/api/homework/submissions", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
        ]);
        const [batchData, submissionData] = await Promise.all([readApiResponse(batchResponse), readApiResponse(submissionResponse)]);
        if (!batchResponse.ok || !batchData.success) throw new Error(batchData.message || "Your classes could not be loaded.");
        if (!submissionResponse.ok || !submissionData.success) throw new Error(submissionData.message || "Homework could not be loaded.");
        if (active) {
          setBatches(batchData.batches || []);
          setSubmissions(submissionData.submissions || []);
          if (batchData.batches?.[0]) setBatchId(batchData.batches[0].id);
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Homework could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user || submitting) return;
    setSubmitting(true); setError(""); setSuccess("");
    try {
      const form = new FormData();
      form.set("batchId", batchId);
      form.set("taskTitle", taskTitle);
      form.set("contentNotes", notesText);
      if (file) form.set("file", file);
      const response = await fetch("/api/homework/submissions", {
        method: "POST",
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        body: form,
      });
      const result = await readApiResponse(response);
      if (!response.ok || !result.success) throw new Error(result.message || "Homework could not be submitted.");
      setTaskTitle(""); setNotesText(""); setFile(null);
      setSuccess("Homework sent to your batch teacher for review.");
      const refresh = await fetch("/api/homework/submissions", { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
      const data = await readApiResponse(refresh);
      if (data.success) setSubmissions(data.submissions || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Homework could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">Learning workspace</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Homework</h1>
      <p className="mt-2 text-sm text-slate-600">Submit written work or a photo/PDF, then follow your teacher’s feedback here.</p>
      {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {success && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
        <form onSubmit={submit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div><h2 className="text-base font-black text-slate-950">Submit your work</h2><p className="mt-1 text-xs text-slate-500">Only the teacher assigned to your chosen batch can review it.</p></div>
          <label className="block text-xs font-bold text-slate-700">Class / batch
            <select required value={batchId} onChange={(event) => setBatchId(event.target.value)} disabled={loading || !batches.length} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
              {batches.length ? batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}{batch.subject ? ` · ${batch.subject}` : ""}</option>) : <option value="">{loading ? "Loading classes…" : "Join a batch before submitting work"}</option>}
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-700">Homework title<input required maxLength={160} value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="For example, Exercise 4.2" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label>
          <label className="block text-xs font-bold text-slate-700">Written solution <span className="font-normal text-slate-400">(optional with an attachment)</span><textarea value={notesText} onChange={(event) => setNotesText(event.target.value)} maxLength={5000} rows={5} placeholder="Show your steps or add a note for your teacher…" className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm leading-6" /></label>
          <label className="block text-xs font-bold text-slate-700">Attach a photo or PDF <span className="font-normal text-slate-400">(up to 15 MB)</span><span className="mt-1.5 flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 text-sm font-medium text-slate-600 hover:border-blue-400 hover:bg-blue-50"><UploadCloud size={17} className="text-blue-600" />{file?.name || "Choose file"}<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} className="sr-only" /></span></label>
          <button disabled={submitting || loading || !batchId} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? <Loader2 size={17} className="animate-spin" /> : <UploadCloud size={17} />}Submit to teacher</button>
        </form>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-end justify-between"><div><h2 className="text-base font-black text-slate-950">Your submissions</h2><p className="mt-1 text-xs text-slate-500">Teacher scores and feedback show here.</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{submissions.length}</span></div>
          {loading ? <div className="py-14 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin" size={20} />Loading your work…</div> : submissions.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center"><FileText size={26} className="mx-auto text-slate-300" /><h3 className="mt-3 text-sm font-bold text-slate-800">Nothing submitted yet</h3><p className="mt-1 text-xs text-slate-500">Your submitted work and grades will appear here.</p></div> : <div className="mt-4 space-y-3">{submissions.map((submission) => <article key={submission.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-bold text-slate-900">{submission.taskTitle}</h3><p className="mt-1 text-xs text-slate-500">{submission.batchName || "Class batch"}{submission.submittedAt && <> · {new Date(submission.submittedAt).toLocaleDateString("en-IN")}</>}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${submission.status === "GRADED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{submission.status}</span></div>
            {submission.contentNotes && <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-slate-600">{submission.contentNotes}</p>}
            {submission.attachmentUrl && <a href={submission.attachmentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-bold text-blue-700 underline">{submission.attachmentName || "View attachment"}</a>}
            {submission.status === "GRADED" ? <div className="mt-3 rounded-xl bg-emerald-50 p-3"><p className="flex items-center gap-1.5 text-xs font-black text-emerald-800"><CheckCircle2 size={14} />Score: {submission.marksObtained}/10</p>{submission.teacherFeedback && <p className="mt-1 text-xs leading-5 text-emerald-900">{submission.teacherFeedback}</p>}</div> : <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"><Clock3 size={13} />Waiting for teacher review</p>}
          </article>)}</div>}
        </section>
      </div>
    </main>
  );
}
