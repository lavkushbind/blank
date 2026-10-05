"use client";
import { readApiResponse } from "@/lib/api-response";

import React, { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { ArrowLeft, Loader2, Send, UserRound } from "lucide-react";
import { auth } from "@/lib/firebase/client";

type ChatMessage = { id: string; text: string; senderId: string; createdAt: string | null };
type ChatData = { success: boolean; message?: string; student?: { id: string; name: string; email?: string; grade?: string | number }; messages?: ChatMessage[] };

export default function TeacherChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<ChatData["student"]>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => onAuthStateChanged(auth, (current) => { setUser(current); if (!current) setLoading(false); }), []);
  useEffect(() => {
    if (!user || !id) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setError("");
      try {
        const response = await fetch(`/api/teacher-chat/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
        const data = await readApiResponse(response) as ChatData;
        if (!response.ok || !data.success) throw new Error(data.message || "Could not open this conversation.");
        if (!cancelled) { setStudent(data.student); setMessages(data.messages || []); }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "Could not load conversation."); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user, id]);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || !user || sending) return;
    setSending(true); setError("");
    try {
      const response = await fetch(`/api/teacher-chat/${encodeURIComponent(id)}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ text }) });
      const data = await readApiResponse(response);
      if (!response.ok || !data.success) throw new Error(data.message || "Message could not be sent.");
      setMessages((current) => [...current, data.message]); setInput("");
    } catch (e) { setError(e instanceof Error ? e.message : "Message could not be sent."); }
    finally { setSending(false); }
  }

  return <main className="mx-auto flex h-[calc(100dvh-64px)] max-w-5xl flex-col px-4 py-5 sm:px-6">
    <header className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><Link href="/batches" aria-label="Back to batches" className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><ArrowLeft size={17}/></Link><div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600"><UserRound size={18}/></div><div className="min-w-0"><h1 className="truncate text-sm font-black text-slate-950">{student?.name || "Student conversation"}</h1><p className="text-xs text-slate-500">{student?.grade ? `Class ${student.grade}` : "Assigned learner"}{student?.email ? ` · ${student.email}` : ""}</p></div></header>
    <section aria-label="Conversation messages" className="my-4 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      {loading ? <div className="flex h-full items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 animate-spin" size={18}/>Loading conversation…</div> : error && !messages.length ? <div role="alert" className="mx-auto mt-10 max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center text-sm text-amber-900">{error}</div> : messages.length === 0 ? <div className="flex h-full flex-col items-center justify-center text-center"><div className="rounded-2xl bg-indigo-50 p-4 text-indigo-600"><Send size={22}/></div><h2 className="mt-4 font-black text-slate-900">Start a helpful conversation</h2><p className="mt-1 max-w-sm text-sm text-slate-500">Messages you send here are saved to this student’s conversation.</p></div> : messages.map((message) => { const mine = message.senderId === user?.uid; return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[70%] ${mine ? "rounded-br-md bg-indigo-600 text-white" : "rounded-bl-md border border-slate-200 bg-slate-50 text-slate-800"}`}><p className="whitespace-pre-wrap break-words">{message.text}</p><time className={`mt-1 block text-right text-[10px] ${mine ? "text-indigo-200" : "text-slate-400"}`}>{message.createdAt ? new Date(message.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Just now"}</time></div></div>; })}
      <div ref={endRef}/>
    </section>
    {error && messages.length > 0 && <p role="alert" className="mb-2 text-sm text-rose-600">{error}</p>}
    <form onSubmit={handleSend} className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"><textarea aria-label="Your message" placeholder="Write a message to this student…" value={input} onChange={(event) => setInput(event.target.value)} maxLength={2000} rows={2} className="max-h-32 min-h-12 flex-1 resize-y rounded-xl border-0 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100"/><button disabled={sending || !input.trim() || !student} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{sending ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}<span className="hidden sm:inline">Send</span></button></form>
  </main>;
}
