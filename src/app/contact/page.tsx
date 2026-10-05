"use client";
import { readApiResponse } from "@/lib/api-response";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function ContactPage() {
  const [busy, setBusy] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/support/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form.entries())) });
      const result = await readApiResponse(response);
      if (!response.ok || !result.success) throw new Error(result.message || "Could not send your request.");
      setTicketId(result.ticketId || "received");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send your request.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5"><Link href="/" className="font-black">BlankLearn Support</Link><Link href="/" className="text-sm font-semibold text-slate-600">Home</Link></div></header>
    <section className="mx-auto max-w-5xl px-5 py-14">
      <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-600">Support</p><h1 className="mt-2 text-3xl font-black">How can we help?</h1><p className="mt-2 text-slate-600">Send a message and it will be added to our support queue. We’ll use your contact details to reply.</p></div>
      <div className="mt-8 max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {ticketId ? <div className="py-8 text-center"><CheckCircle2 className="mx-auto text-emerald-600" size={38}/><h2 className="mt-3 text-xl font-bold">Your request is in the support queue</h2><p className="mt-2 text-sm text-slate-600">Reference: <span className="font-mono">{ticketId}</span></p></div> : <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-semibold">Name<input name="name" required maxLength={100} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500"/></label>
          <label className="block text-sm font-semibold">Email<input name="email" type="email" required maxLength={200} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500"/></label>
          <label className="block text-sm font-semibold">Phone<input name="phone" type="tel" required maxLength={30} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500"/></label>
          <label className="block text-sm font-semibold">Message<textarea name="message" required minLength={10} maxLength={3000} rows={5} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500"/></label>
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden"/>
          {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
          <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">{busy && <Loader2 size={16} className="animate-spin"/>}{busy ? "Sending…" : "Send support request"}</button>
        </form>}
      </div>
    </section>
  </main>;
}
