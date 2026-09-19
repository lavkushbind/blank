import React from "react";
import Link from "next/link";

export default function TermsAndRefundPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-sm space-y-6">
        <Link href="/" className="text-xs font-bold text-indigo-600 hover:underline">← Back to BlankLearn</Link>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-950">Terms of Service & 100% Refund Policy</h1>

        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <section className="space-y-1">
            <h3 className="font-bold text-slate-900 text-sm">1. Strict 1:5 Invariant Guarantee</h3>
            <p>BlankLearn guarantees that no paid or trial pod will ever exceed 5 enrolled students per session. In the rare event of a scheduling conflict, a separate pod is created at platform cost.</p>
          </section>

          <section className="space-y-1">
            <h3 className="font-bold text-slate-900 text-sm">2. 100% Money-Back Refund Policy</h3>
            <p>If you or your child are not satisfied with the teaching quality after attending the first 2 classes of any monthly subscription, you are entitled to a full 100% refund with zero cancellation fees. Refund requests are processed via Razorpay within 5 business days.</p>
          </section>

          <section className="space-y-1">
            <h3 className="font-bold text-slate-900 text-sm">3. Code of Conduct & Classroom Safety</h3>
            <p>Mentors undergo mandatory KYC and criminal background checks before onboarding. Any harassment, abusive language, or inappropriate behavior by any participant leads to immediate expulsion.</p>
          </section>
        </div>
      </div>
    </div>
  );
}