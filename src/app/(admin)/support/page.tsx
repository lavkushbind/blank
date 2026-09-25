"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, limit, orderBy, query, updateDoc } from "firebase/firestore";
import { CheckCircle2, Loader2, RefreshCw, Send } from "lucide-react";
import { db } from "@/lib/firebase/client";

type Ticket = { id: string; name?: string; email?: string; phone?: string; message?: string; status?: string; adminNote?: string; createdAt?: { toDate?: () => Date } };

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const selected = useMemo(() => tickets.find((ticket) => ticket.id === selectedId) || null, [tickets, selectedId]);

  async function load() {
    setLoading(true); setError("");
    try {
      const snap = await getDocs(query(collection(db, "support_tickets"), orderBy("createdAt", "desc"), limit(100)));
      const rows = snap.docs.map((item) => ({ id: item.id, ...item.data() } as Ticket));
      setTickets(rows); setSelectedId((current) => rows.some((row) => row.id === current) ? current : rows[0]?.id || "");
    } catch (cause) { console.error("Support tickets could not be loaded", cause); setError("Support tickets could not be loaded."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function saveTicket(status = selected?.status || "OPEN") {
    if (!selected) return;
    setSaving(true); setError(""); setMessage("");
    try {
      await updateDoc(doc(db, "support_tickets", selected.id), { status, adminNote: note.trim(), updatedAt: new Date() });
      setTickets((rows) => rows.map((row) => row.id === selected.id ? { ...row, status, adminNote: note.trim() } : row));
      setMessage(status === "RESOLVED" ? "Ticket marked resolved and the internal note was saved." : "Internal note saved. No email or message was sent to the requester.");
    } catch (cause) { console.error("Ticket update failed", cause); setError("Ticket update failed."); }
    finally { setSaving(false); }
  }

  useEffect(() => { setNote(selected?.adminNote || ""); }, [selected?.id]);

  return <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6"><header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5"><div><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Support queue</p><h1 className="mt-2 text-2xl font-black text-slate-950">Contact requests</h1><p className="mt-1 text-sm text-slate-600">Review saved requests and record internal notes. Replies are not sent from this screen.</p></div><button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold"><RefreshCw size={15} className={loading ? "animate-spin" : ""}/>Refresh</button></header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}{message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
    {loading ? <div className="py-16 text-center text-slate-500"><Loader2 className="mx-auto animate-spin"/><p className="mt-3 text-sm">Loading requests…</p></div> : tickets.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><CheckCircle2 className="mx-auto text-slate-300" size={32}/><h2 className="mt-3 font-bold text-slate-800">No support requests yet</h2><p className="mt-1 text-sm text-slate-500">Submitted contact forms will appear here.</p></div> : <div className="grid gap-5 lg:grid-cols-[320px_1fr]"><aside className="space-y-2">{tickets.map((ticket) => <button key={ticket.id} onClick={() => setSelectedId(ticket.id)} className={`w-full rounded-2xl border p-4 text-left ${ticket.id === selectedId ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white"}`}><div className="flex justify-between gap-2"><span className="truncate text-sm font-bold text-slate-900">{ticket.name || "Contact request"}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ticket.status === "RESOLVED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{ticket.status || "OPEN"}</span></div><p className="mt-1 truncate text-xs text-slate-500">{ticket.email || "No email"}</p><p className="mt-2 line-clamp-2 text-xs text-slate-600">{ticket.message}</p></button>)}</aside>{selected && <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="border-b border-slate-100 pb-4"><h2 className="text-lg font-black text-slate-950">{selected.name || "Contact request"}</h2><p className="mt-1 text-sm text-slate-600">{selected.email} {selected.phone && `· ${selected.phone}`}</p><p className="mt-1 text-xs text-slate-400">{selected.createdAt?.toDate?.()?.toLocaleString?.() || "Date not available"}</p></div><div className="mt-5 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-800">{selected.message || "No message content"}</div><label className="mt-5 block text-xs font-bold text-slate-700">Internal note<textarea rows={4} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-indigo-400" placeholder="Record follow-up details for your team"/></label><div className="mt-4 flex flex-wrap gap-3"><button onClick={() => void saveTicket()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? <Loader2 size={15} className="animate-spin"/> : <Send size={15}/>}Save internal note</button>{selected.status !== "RESOLVED" && <button onClick={() => void saveTicket("RESOLVED")} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50">Mark resolved</button>}</div></section>}</div>}
  </main>;
}
