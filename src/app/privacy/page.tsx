import React from "react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-sm space-y-6">
        <Link href="/" className="text-xs font-bold text-indigo-600 hover:underline">← Back to BlankLearn</Link>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-950">Child Safety & Privacy Policy</h1>
        <p className="text-xs text-slate-500 font-mono">Compliant with India Digital Personal Data Protection (DPDP) Act 2023</p>

        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <section className="space-y-1">
            <h3 className="font-bold text-slate-900 text-sm">1. Protection of Minor Data</h3>
            <p>BlankLearn operates strictly under parental consent. No student personal identifiable information (PII) is sold, traded, or used for targeted third-party advertising.</p>
          </section>

          <section className="space-y-1">
            <h3 className="font-bold text-slate-900 text-sm">2. LiveKit WebRTC Camera & Audio</h3>
            <p>Video feeds are transmitted in real time strictly between the verified mentor and the 5 enrolled students in the private room. No student video is publicly broadcast or recorded without parental consent.</p>
          </section>

          <section className="space-y-1">
            <h3 className="font-bold text-slate-900 text-sm">3. Parent Access Rights</h3>
            <p>Parents hold the absolute right to view, correct, or request the deletion of all diagnostic reports and account data associated with their child by writing to support@blanklearn.com.</p>
          </section>
        </div>
      </div>
    </div>
  );
}