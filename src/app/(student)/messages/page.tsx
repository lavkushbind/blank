"use client";
import { readApiResponse } from "@/lib/api-response";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Loader2, MessageCircle, UserRound } from "lucide-react";
import { auth } from "@/lib/firebase/client";

type Message = { id: string; text: string; senderId: string; createdAt: string | null };
type Conversation = { teacherName: string; messages: Message[] };

export default function StudentMessagesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => onAuthStateChanged(auth, (current) => { setUser(current); if (!current) setLoading(false); }), []);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/student-messages", { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
        const result = await readApiResponse(response);
        if (!response.ok || !result.success) throw new Error(result.message || "Messages could not be loaded.");
        if (!cancelled) setConversations(result.conversations || []);
      } catch (cause) { if (!cancelled) setError(cause instanceof Error ? cause.message : "Messages could not be loaded."); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user]);
  return <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6"><p className="text-xs font-black uppercase tracking-[.2em] text-indigo-600">Your classroom</p><h1 className="mt-2 text-3xl font-black text-slate-950">Messages</h1><p className="mt-2 text-sm text-slate-600">Updates and notes from your teachers.</p>
    {loading ? <div className="flex justify-center py-20 text-slate-500"><Loader2 className="animate-spin"/></div> : error ? <p role="alert" className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : conversations.length === 0 ? <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><MessageCircle className="mx-auto text-slate-300" size={30}/><h2 className="mt-4 font-black text-slate-900">No messages yet</h2><p className="mt-2 text-sm text-slate-500">Teacher messages will appear here.</p></div> : <div className="mt-6 space-y-5">{conversations.map((conversation,index)=><section key={`${conversation.teacherName}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><UserRound size={18}/></div><h2 className="font-black text-slate-900">{conversation.teacherName}</h2></div><div className="space-y-3">{conversation.messages.map(message=><div key={message.id} className={`flex ${message.senderId===user?.uid?"justify-end":"justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm ${message.senderId===user?.uid?"bg-indigo-600 text-white":"bg-slate-50 text-slate-800"}`}><p className="whitespace-pre-wrap">{message.text}</p><time className="mt-1 block text-right text-[10px] opacity-70">{message.createdAt?new Date(message.createdAt).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"}):"Just now"}</time></div></div>)}</div></section>)}</div>}
  </main>;
}
