"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { PlatformOffer } from "@/components/PlatformOffer";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, BookOpen, ChevronDown, GraduationCap, LogOut, Menu, Search, Settings, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { BrandLogo } from "@/components/BrandLogo";

export type WorkspaceLink = { href: string; label: string; icon: LucideIcon };

export function WorkspaceShell({ children, role, links, searchHref, settingsHref, exitLabel, exitHref }: {
  children: React.ReactNode; role: "student" | "teacher"; links: WorkspaceLink[]; searchHref: string; settingsHref: string; exitLabel: string; exitHref: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    router.push(`${searchHref}${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`);
  }
  async function signOut() {
    try {
      await auth.signOut();
      document.cookie = "__session=; path=/; max-age=0";
      document.cookie = "user_role=; path=/; max-age=0";
      router.replace(exitHref);
    } catch (error) { console.error("Sign out failed", error); }
  }
  const identity = user?.displayName || user?.email?.split("@")[0] || (role === "teacher" ? "Teacher" : "Student");
  const initials = identity.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || (role === "teacher" ? "T" : "S");

  return <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
    <header className="sticky top-0 z-40 h-[68px] border-b border-[#e2e9f3] bg-white/95 backdrop-blur-xl">
      <div className="flex h-full items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href={role === "teacher" ? "/dashboard" : "/hub"} className="flex w-[205px] shrink-0 items-center gap-2.5">
          <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl shadow-md shadow-indigo-200"><BrandLogo className="h-full w-full object-cover" /></span>
          <span className="min-w-0"><span className="block truncate text-[15px] font-black tracking-tight text-[#101a35]">{role === "teacher" ? "BlankLearn Studio" : "BlankLearn"}</span><span className={`block text-[9px] font-black uppercase tracking-[.15em] ${role === "teacher" ? "text-indigo-600" : "text-emerald-600"}`}>{role === "teacher" ? "Mentor workspace" : "Student pod"}</span></span>
        </Link>
        <form onSubmit={submitSearch} className="hidden max-w-[520px] flex-1 md:block"><label className="relative block"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={role === "teacher" ? "Search students, batches, classes…" : "Search classes, subjects, batches…"} className="h-10 w-full rounded-xl border border-[#e5ebf5] bg-[#f6f8fc] pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"/></label></form>
        <div className="ml-auto flex shrink-0 items-center gap-2.5">
          <Link href={settingsHref} aria-label="Settings" className="hidden h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 sm:flex"><Settings size={18}/></Link>
          <div className="hidden items-center gap-2.5 border-l border-slate-200 pl-4 sm:flex"><div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-xs font-black text-indigo-700">{initials}</div><div className="max-w-[150px]"><p className="truncate text-xs font-black text-[#101a35]">{identity}</p><p className="text-[10px] capitalize text-slate-500">{role}</p></div><ChevronDown size={15} className="text-slate-400"/></div>
          <button type="button" onClick={() => setMobileOpen((value) => !value)} aria-label="Toggle navigation" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 md:hidden"><Menu size={18}/></button>
          <button type="button" onClick={() => void signOut()} className="hidden items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 sm:flex"><LogOut size={15}/>{exitLabel}</button>
        </div>
      </div>
    </header>
    <div className="mx-auto flex min-h-[calc(100vh-68px)] max-w-[1920px]">
      <aside className="sticky top-[68px] hidden h-[calc(100vh-68px)] w-[224px] shrink-0 border-r border-[#e2e9f3] bg-white px-3 py-5 md:block">
        <p className="px-3 pb-3 text-[9px] font-black uppercase tracking-[.18em] text-slate-400">Workspace</p>
        <nav className="space-y-1">{links.map((item) => { const active = pathname === item.href || (item.href !== "/hub" && item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)); const Icon = item.icon; return <Link key={item.href} href={item.href} className={`group flex h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold transition ${active ? "bg-blue-50 text-blue-700 shadow-[inset_3px_0_0_#2563eb]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}><Icon size={17} className={active ? "text-blue-600" : "text-slate-400 group-hover:text-blue-600"}/>{item.label}{active && <ArrowUpRight size={13} className="ml-auto text-blue-400"/>}</Link>; })}</nav>
        <div className="absolute inset-x-3 bottom-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-3.5"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">{role === "teacher" ? <GraduationCap size={18}/> : <BookOpen size={18}/>}</div><p className="mt-3 text-xs font-black text-slate-900">{role === "teacher" ? "Your teaching space" : "Keep learning"}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{role === "teacher" ? "Manage your classes and learners." : "Your classes and resources in one place."}</p></div>
      </aside>
      {mobileOpen && <div className="fixed inset-x-0 top-[68px] z-40 border-b border-slate-200 bg-white p-3 shadow-lg md:hidden"><form onSubmit={submitSearch} className="mb-2"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search classes and batches" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"/></form><nav className="grid grid-cols-2 gap-1">{links.map((item) => { const Icon = item.icon; return <Link onClick={() => setMobileOpen(false)} key={item.href} href={item.href} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50"><Icon size={15}/>{item.label}</Link>; })}<Link href={settingsHref} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50"><Settings size={15}/>Settings</Link><button onClick={() => void signOut()} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-rose-50"><LogOut size={15}/>{exitLabel}</button></nav></div>}
      <main className="min-w-0 flex-1"><div className="px-4"><PlatformOffer/></div>{children}<Link href="/learning-help" className="fixed bottom-5 right-5 z-50 rounded-full bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-indigo-700">Help & chat</Link></main>
    </div>
  </div>;
}
