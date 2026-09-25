import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";

export default function ParentChatPage() {
  return <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6"><Link href="/home" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500"><ArrowLeft size={14}/>Parent dashboard</Link><section className="mt-5 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><MessageCircle className="mx-auto text-indigo-600" size={32}/><h1 className="mt-4 text-xl font-black text-slate-950">Parent messaging is not connected yet</h1><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">This account does not have an enabled parent-to-teacher messaging channel. Messages entered here will not be sent. Contact support if you need help reaching your teacher.</p><Link href="/contact" className="mt-5 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">Contact support</Link></section></main>;
}
