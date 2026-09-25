import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, CircleHelp, Mail, MessageCircle, Video } from "lucide-react";

const helpLinks = [
  { href: "/faq", icon: CircleHelp, title: "Frequently asked questions", text: "Find answers about classes, demos, batches and your account." },
  { href: "/contact", icon: Mail, title: "Contact support", text: "Send the BlankLearn team a question or report an issue." },
  { href: "/classes", icon: CalendarDays, title: "Your classes", text: "Check upcoming, live and completed classes." },
  { href: "/explore", icon: BookOpen, title: "Explore batches", text: "Browse learning plans or request a suitable batch." },
  { href: "/messages", icon: MessageCircle, title: "Teacher messages", text: "Read notes and updates from your teachers." },
  { href: "/demo-booking", icon: Video, title: "Book a demo", text: "Choose a program and request a trial class." },
];

export default function HelpPage() {
  return <main className="min-h-[calc(100vh-68px)] bg-[#f4f7fb] px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><div className="rounded-3xl border border-blue-100 bg-gradient-to-r from-[#dcedff] to-white p-6 sm:p-9"><p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">BlankLearn help center</p><h1 className="mt-2 text-3xl font-black tracking-tight text-[#101a35]">How can we help?</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Choose a topic below to get back to learning or reach the support team.</p></div><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{helpLinks.map(({ href, icon: Icon, title, text })=><Link key={href} href={href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon size={19}/></span><h2 className="mt-4 flex items-center justify-between gap-2 text-sm font-black text-slate-900">{title}<ArrowRight size={15} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600"/></h2><p className="mt-2 text-xs leading-5 text-slate-500">{text}</p></Link>)}</div></div></main>;
}
