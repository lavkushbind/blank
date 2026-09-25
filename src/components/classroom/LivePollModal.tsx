"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { BarChart2, CheckCircle2, Clock3, Loader2, Plus, X } from "lucide-react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

type Poll = { id: string; question: string; options: string[]; counts: number[]; totalVotes: number; myVote: number | null; status: "ACTIVE" | "CLOSED" };

async function readPollResponse(response: Response) {
  const raw = await response.text();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(response.status === 404
      ? "Poll service was not found. Reload the classroom and try again."
      : "Poll service returned an unexpected response. Reload the classroom and try again.");
  }
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error("Poll service returned invalid data. Please try again.");
  }
}

export function LivePollModal({ sessionId, isTeacher = false }: { sessionId: string; isTeacher?: boolean }) {
  const [user, setUser] = useState<User | null>(null);
  const [poll, setPoll] = useState<Poll | null>(null);
  const [dismissedPollId, setDismissedPollId] = useState<string | null>(null);
  const [showCreator, setShowCreator] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const refresh = useCallback(async () => {
    if (!user || !sessionId) return;
    try {
      const response = await fetch(`/api/class_sessions/${encodeURIComponent(sessionId)}/poll`, { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
      const result = await readPollResponse(response);
      if (!response.ok || !result.success) throw new Error(result.message || "Poll status unavailable.");
      setPoll(result.poll || null);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Poll status unavailable.");
    }
  }, [sessionId, user]);

  useEffect(() => {
    if (!user) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 1500);
    return () => window.clearInterval(timer);
  }, [refresh, user]);

  async function act(action: string, payload: Record<string, unknown> = {}) {
    if (busy) return;
    if (!user) { setError("Your sign-in is still loading. Please try again in a moment."); return null; }
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/class_sessions/${encodeURIComponent(sessionId)}/poll`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ action, ...payload }) });
      const result = await readPollResponse(response);
      if (!response.ok || !result.success) throw new Error(result.message || "Poll action failed.");
      setPoll(result.poll || null);
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Poll action failed.");
      return null;
    } finally { setBusy(false); }
  }

  async function launch(event: FormEvent) {
    event.preventDefault();
    const cleanOptions = options.map((item) => item.trim()).filter(Boolean);
    if (question.trim().length < 3 || question.trim().length > 500) {
      setError("Enter a poll question between 3 and 500 characters.");
      return;
    }
    if (cleanOptions.length < 2 || cleanOptions.length > 6 || new Set(cleanOptions.map((item) => item.toLowerCase())).size !== cleanOptions.length) {
      setError("Add 2 to 6 different answer choices.");
      return;
    }
    const result = await act("launch", { question: question.trim(), options: cleanOptions });
    if (result) { setShowCreator(false); setQuestion(""); setOptions(["", ""]); }
  }

  return <>
    {isTeacher && poll?.status !== "ACTIVE" && <button type="button" onClick={() => setShowCreator(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"><BarChart2 size={14}/>Start a poll</button>}
    {poll && dismissedPollId === poll.id && <button type="button" onClick={() => setDismissedPollId(null)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/75 transition hover:bg-white/10"><BarChart2 size={14}/>{poll.status === "ACTIVE" ? "Open poll" : "Poll results"}</button>}
    {error && !poll && <div role="alert" className="fixed bottom-24 right-4 z-[60] max-w-sm rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 shadow-lg">Poll unavailable: {error}</div>}

    {showCreator && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setShowCreator(false); }}><form onSubmit={launch} className="w-full max-w-lg space-y-4 rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Live classroom</p><h2 className="mt-1 text-lg font-black text-slate-950">Create a poll</h2></div><button type="button" aria-label="Close poll creator" disabled={busy} onClick={() => { setShowCreator(false); setError(""); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={17}/></button></div><label className="block text-xs font-bold text-slate-700">Question<input required minLength={3} maxLength={500} autoFocus value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask the class a question" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 caret-indigo-600 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"/></label><div className="space-y-2"><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-700">Answer choices</span><button type="button" disabled={options.length >= 6} onClick={() => setOptions((current) => [...current, ""])} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 disabled:opacity-40"><Plus size={14}/>Add option</button></div>{options.map((option, index) => <div key={index} className="flex gap-2"><input required maxLength={200} value={option} onChange={(event) => setOptions((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} placeholder={`Option ${index + 1}`} className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 caret-indigo-600 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"/>{options.length > 2 && <button type="button" aria-label={`Remove option ${index + 1}`} onClick={() => setOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg px-2 text-slate-400 hover:bg-slate-100"><X size={16}/></button>}</div>)}</div>{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>}<button disabled={busy || question.trim().length < 3 || options.filter((item) => item.trim()).length < 2} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin"/> : <BarChart2 size={16}/>}Publish poll to class</button></form></div>}

    {poll && dismissedPollId !== poll.id && <aside aria-label="Live class poll" className="fixed bottom-24 right-4 z-50 w-[min(360px,calc(100vw-2rem))] space-y-3 rounded-3xl border-2 border-indigo-500 bg-white p-5 text-slate-900 shadow-2xl sm:bottom-20 sm:right-6"><header className="flex items-center justify-between border-b border-slate-100 pb-2"><span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-700"><Clock3 size={13}/>{poll.status === "ACTIVE" ? "Live poll" : "Poll results"} · {poll.totalVotes} vote{poll.totalVotes === 1 ? "" : "s"}</span><div className="flex items-center gap-2">{isTeacher && poll.status === "ACTIVE" && <button type="button" disabled={busy} onClick={() => void act("close", { pollId: poll.id })} className="text-xs font-bold text-slate-500 hover:text-slate-900">Close poll</button>}<button type="button" aria-label="Hide poll" title="Hide poll" onClick={() => setDismissedPollId(poll.id)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"><X size={15}/></button></div></header><h3 className="text-sm font-black leading-snug">{poll.question}</h3><div className="space-y-2">{poll.options.map((option, index) => { const count = poll.counts[index] || 0; const percent = poll.totalVotes ? Math.round(count / poll.totalVotes * 100) : 0; const chosen = poll.myVote === index; return <button key={`${poll.id}-${index}`} type="button" disabled={isTeacher || busy || poll.status !== "ACTIVE" || poll.myVote !== null} onClick={() => void act("vote", { pollId: poll.id, optionIndex: index })} className={`relative w-full overflow-hidden rounded-xl border p-3 text-left text-xs font-semibold transition ${chosen ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 disabled:hover:border-slate-200"}`}><span className="absolute inset-y-0 left-0 bg-indigo-100/80 transition-all" style={{ width: `${percent}%` }}/><span className="relative flex items-center justify-between gap-2"><span>{option}{chosen && <CheckCircle2 size={13} className="ml-1 inline text-indigo-600"/>}</span><span className="font-mono text-[10px] text-slate-600">{count} · {percent}%</span></span></button>; })}</div>{!isTeacher && poll.myVote !== null && <p className="text-center text-[11px] font-bold text-emerald-700">Your vote has been counted.</p>}{poll.status === "CLOSED" && <p className="text-center text-[11px] text-slate-500">This poll is closed.</p>}{error && <p role="alert" className="text-[11px] font-semibold text-red-600">{error}</p>}</aside>}
  </>;
}
