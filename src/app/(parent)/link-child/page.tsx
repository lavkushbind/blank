import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export default function LinkChildPage() {
  return <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
    <Link href="/home" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900"><ArrowLeft size={14}/>Back to Dashboard</Link>
    <section className="mt-6 rounded-3xl border border-amber-200 bg-white p-7 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><ShieldAlert size={22}/></div>
      <h1 className="mt-4 text-xl font-black text-slate-950">Student account linking is not enabled</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">A secure pairing code and verified parent sign-in flow are required before accounts can be linked. No link has been created. Please contact support for help with your account.</p>
      <div className="mt-5 flex gap-3"><Link href="/contact" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">Contact support</Link><Link href="/home" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">Back to dashboard</Link></div>
    </section>
  </main>;
}
