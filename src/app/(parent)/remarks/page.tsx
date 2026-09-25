import Link from "next/link";
import { ArrowLeft, MessageSquareText } from "lucide-react";

export default function ParentRemarksPage() {
  return <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6"><Link href="/home" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500"><ArrowLeft size={14}/>Parent dashboard</Link><section className="mt-5 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><MessageSquareText className="mx-auto text-indigo-600" size={32}/><h1 className="mt-4 text-xl font-black text-slate-950">Teacher feedback</h1><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">No teacher feedback is available for linked students yet. Feedback will appear here after a teacher submits a class summary.</p></section></main>;
}
