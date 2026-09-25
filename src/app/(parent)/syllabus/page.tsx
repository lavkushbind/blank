import Link from "next/link";
import { ArrowLeft, BookOpenCheck } from "lucide-react";

export default function ParentSyllabusPage() {
  return <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6"><Link href="/home" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500"><ArrowLeft size={14}/>Parent dashboard</Link><section className="mt-5 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><BookOpenCheck className="mx-auto text-indigo-600" size={32}/><h1 className="mt-4 text-xl font-black text-slate-950">Syllabus progress</h1><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">Chapter progress tracking is not connected yet. Class notes and learning materials shared by teachers are available in the student Vault.</p><Link href="/vault" className="mt-5 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">Open class Vault</Link></section></main>;
}
