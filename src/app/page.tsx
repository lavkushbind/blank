 "use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  GraduationCap,
  Menu,
  Play,
  Quote,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  X,
  Zap,
} from "lucide-react";
import { onValue, ref } from "firebase/database";
import { realtimeDb } from "@/lib/firebase/client";
import { BrandLogo } from "@/components/BrandLogo";

/*
 * BlankLearn public landing page
 * Goals:
 * - Premium, conversion-focused public homepage
 * - Primary CTA: Book Demo
 * - Teacher videos loaded from Realtime Database /VideoUploads
 * - Teacher application CTA in footer
 * - No fake metrics/reviews are hardcoded
 * - Responsive + animated without external animation dependencies
 */

const DEMO_PROGRAMS = [
  {
    title: "Mathematics",
    text: "Concept clarity, problem solving and live doubt support.",
  },
  {
    title: "English",
    text: "Grammar, communication and stronger fundamentals.",
  },
  {
    title: "Math + Science + English",
    text: "A broader live learning plan for students who need support across subjects.",
  },
];

const STEPS = [
  ["01", "Choose your class", "Select your class, board and what you want to learn."],
  ["02", "Pick a convenient slot", "Choose a fixed one-hour slot that works for your child."],
  ["03", "Get matched", "BlankLearn matches the student with an eligible teacher and available batch."],
  ["04", "Join the live demo", "Meet the teacher and experience the classroom before deciding."],
];

const FAQS = [
  ["How does the demo work?", "Choose your class, board, program and preferred one-hour slot. We then match you with an eligible teacher or an available existing batch."],
  ["How many students are in a group?", "A group batch is designed for a maximum of 5 students. Individual demos can be offered separately."],
  ["Which classes are supported?", "BlankLearn is currently designed for Classes 1–10."],
  ["Which subjects can I choose?", "The initial demo programs are Mathematics, English, and Math + Science + English."],
  ["Is the demo always paid?", "The demo price can change based on the active offer. BlankLearn can run a free demo campaign or a paid demo campaign."],
];

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`reveal ${className}`}>{children}</div>;
}

function DemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-[0_30px_100px_rgba(0,0,0,.35)]">
        <div className="relative overflow-hidden bg-[#101827] px-6 py-7 text-white">
          <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-blue-500/30 blur-3xl" />
          <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold">
              <Sparkles size={13} /> Live demo
            </div>
            <h3 className="text-2xl font-black tracking-tight">Let&apos;s find the right class.</h3>
            <p className="mt-1 text-sm text-white/60">Choose the demo you want to try.</p>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <Link
            href="/demo-booking"
            onClick={onClose}
            className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50"
          >
            <div>
              <p className="font-bold text-slate-950">Book a demo</p>
              <p className="mt-1 text-xs text-slate-500">Class, board, program and one-hour slot</p>
            </div>
            <ArrowRight className="text-blue-600 transition group-hover:translate-x-1" size={18} />
          </Link>

          <button
            onClick={onClose}
            className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Continue exploring
          </button>
        </div>
      </div>
    </div>
  );
}

function Navbar({ onDemo }: { onDemo: () => void }) {
  const [menu, setMenu] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-xs font-black text-white shadow-lg shadow-slate-950/10 transition group-hover:-rotate-3">
            <BrandLogo className="h-full w-full rounded-[inherit] object-cover" />
          </div>
          <div>
            <div className="text-[17px] font-black tracking-tight text-slate-950">BlankLearn</div>
            <div className="text-[8px] font-bold uppercase tracking-[.18em] text-blue-600">Live learning</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 text-[13px] font-semibold text-slate-600 md:flex">
          <a href="#how-it-works" className="hover:text-slate-950">How it works</a>
          <a href="#programs" className="hover:text-slate-950">Programs</a>
          <a href="#pricing" className="hover:text-slate-950">Pricing</a>
          <a href="#teachers" className="hover:text-slate-950">Teachers</a>
          <a href="#faq" className="hover:text-slate-950">FAQ</a>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/student-auth" className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100">
            Login
          </Link>
          <button onClick={onDemo} className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-blue-700">
            Book Demo <ArrowRight className="ml-1 inline" size={13} />
          </button>
        </div>

        <button onClick={() => setMenu(!menu)} className="rounded-xl p-2 text-slate-800 md:hidden">
          {menu ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>

      {menu && (
        <div className="border-t border-slate-100 bg-white px-4 py-4 md:hidden">
          <div className="space-y-1">
            <a onClick={() => setMenu(false)} href="#how-it-works" className="block rounded-xl px-3 py-3 text-sm font-semibold">How it works</a>
            <a onClick={() => setMenu(false)} href="#programs" className="block rounded-xl px-3 py-3 text-sm font-semibold">Programs</a>
            <a onClick={() => setMenu(false)} href="#pricing" className="block rounded-xl px-3 py-3 text-sm font-semibold">Pricing</a>
            <a onClick={() => setMenu(false)} href="#teachers" className="block rounded-xl px-3 py-3 text-sm font-semibold">Teachers</a>
            <a onClick={() => setMenu(false)} href="#faq" className="block rounded-xl px-3 py-3 text-sm font-semibold">FAQ</a>
            <button onClick={() => { setMenu(false); onDemo(); }} className="mt-2 w-full rounded-xl bg-slate-950 py-3 text-sm font-bold text-white">Book Demo</button>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero({ onDemo }: { onDemo: () => void }) {
  return (
    <section className="relative overflow-hidden bg-[#f8fafc]">
      <div className="hero-grid absolute inset-0 opacity-60" />
      <div className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-blue-400/15 blur-3xl" />
      <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-violet-400/15 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 md:pb-28 md:pt-24 lg:grid-cols-[1.03fr_.97fr] lg:px-8">
        <Reveal>
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3.5 py-2 text-[11px] font-bold text-slate-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live classes for Classes 1–10
            </div>

            <h1 className="text-5xl font-black leading-[.98] tracking-[-.055em] text-slate-950 sm:text-6xl lg:text-[76px]">
              Learning that feels
              <span className="relative mx-2 inline-block text-blue-600">
                personal.
                <span className="hero-underline absolute -bottom-1 left-0 h-2 w-full rounded-full bg-blue-200/80" />
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Small live classes, carefully matched teachers and a learning experience built around your child&apos;s class, board and schedule.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button onClick={onDemo} className="group rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white shadow-[0_16px_35px_rgba(37,99,235,.24)] transition hover:-translate-y-1 hover:bg-blue-700">
                Book a live demo
                <ArrowRight className="ml-2 inline transition group-hover:translate-x-1" size={16} />
              </button>
              <a href="#teachers" className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-center text-sm font-bold text-slate-800 shadow-sm transition hover:-translate-y-1 hover:border-slate-300">
                Meet our teachers
              </a>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-emerald-600" /> Up to 5 students</span>
              <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-emerald-600" /> 1-hour slots</span>
              <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-emerald-600" /> Live teacher interaction</span>
            </div>
          </div>
        </Reveal>

        <Reveal className="lg:pl-8">
          <div className="relative mx-auto max-w-[560px]">
            <div className="absolute -inset-5 rounded-[40px] bg-gradient-to-br from-blue-500/20 via-violet-500/10 to-transparent blur-2xl" />

            <div className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-white p-3 shadow-[0_30px_90px_rgba(15,23,42,.16)]">
              <div className="rounded-[24px] bg-slate-950 p-3">
                <div className="flex items-center justify-between border-b border-white/10 px-3 pb-3">
                  <div>
                    <p className="text-[10px] font-semibold text-white/45">LIVE CLASSROOM</p>
                    <p className="text-sm font-bold text-white">Mathematics · Class 7</p>
                  </div>
                  <div className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-300">LIVE</div>
                </div>

                <div className="mt-3 aspect-[16/10] overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-5">
                  <div className="flex h-full flex-col justify-between">
                    <div>
                      <div className="mb-4 text-[10px] font-semibold uppercase tracking-[.2em] text-white/35">Teacher whiteboard</div>
                      <div className="rounded-2xl border border-white/10 bg-white/[.06] p-5">
                        <p className="text-xs text-blue-300">Today&apos;s concept</p>
                        <p className="mt-2 text-2xl font-black tracking-tight text-white">Linear Equations</p>
                        <p className="mt-3 font-mono text-sm text-white/65">2x + 5 = 15</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {["Teacher", "A", "R", "S", "P"].map((x, i) => (
                        <div key={x} className={`flex h-11 flex-1 items-center justify-center rounded-xl border text-[10px] font-bold ${i === 0 ? "border-blue-400/30 bg-blue-500/15 text-blue-200" : "border-white/10 bg-white/5 text-white/40"}`}>
                          {x}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between px-2 pb-1 text-[10px] text-white/45">
                  <span>Teacher + small group</span>
                  <span className="inline-flex items-center gap-1"><ShieldCheck size={12} /> Private classroom</span>
                </div>
              </div>
            </div>

            <div className="float-card absolute -bottom-5 -left-4 hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Class format</p>
              <p className="mt-1 text-sm font-black text-slate-950">Maximum 5 students</p>
            </div>

            <div className="float-card-delayed absolute -right-4 top-10 hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl sm:block">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-blue-600"><Clock3 size={15} /></div>
                <div>
                  <p className="text-[10px] text-slate-400">Choose</p>
                  <p className="text-xs font-black text-slate-900">Your 1-hour slot</p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function VideoShowcase() {
  const [videos, setVideos] = useState<{ id: string; url: string; thumbnail?: string; name?: string }[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const videosRef = ref(realtimeDb, "VideoUploads");
    return onValue(videosRef, (snapshot) => {
      const value = snapshot.val() || {};
      const list = Object.entries(value)
        .map(([id, raw]: [string, any]) => ({
          id,
          url: raw?.videoUrl || raw?.postUrl || raw?.url || "",
          thumbnail: raw?.thumbnail || raw?.image || "",
          name: raw?.name || "Teacher introduction",
        }))
        .filter((v) => v.url)
        .slice(0, 6);

      setVideos(list);
    });
  }, []);

  return (
    <section id="teachers" className="bg-slate-950 py-24 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-blue-300">
                <Video size={13} /> Meet the teachers
              </div>
              <h2 className="max-w-2xl text-4xl font-black tracking-tight sm:text-5xl">See the people behind the class.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/55">
                Short teacher videos let parents get a feel for the teaching style before booking a demo.
              </p>
            </div>
            <Link href="/teachers" className="text-sm font-bold text-white/80 hover:text-white">Explore all teachers <ArrowRight className="ml-1 inline" size={15} /></Link>
          </div>
        </Reveal>

        {videos.length > 0 ? (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video, i) => (
              <Reveal key={video.id}>
                <article className={`group overflow-hidden rounded-[24px] border border-white/10 bg-white/[.045] transition duration-500 hover:-translate-y-1 hover:border-white/20 ${active === video.id ? "ring-1 ring-blue-400/50" : ""}`}>
                  <div className="relative aspect-video overflow-hidden bg-slate-900">
                    <video
                      src={video.url}
                      poster={video.thumbnail}
                      controls={active === video.id}
                      playsInline
                      preload="metadata"
                      onPlay={() => setActive(video.id)}
                      onEnded={() => setActive(null)}
                      className="h-full w-full object-cover"
                    />
                    {active !== video.id && (
                      <button
                        aria-label="Play teacher video"
                        onClick={() => setActive(video.id)}
                        className="absolute inset-0 grid place-items-center bg-gradient-to-t from-black/45 to-transparent"
                      >
                        <span className="grid h-14 w-14 place-items-center rounded-full bg-white text-slate-950 shadow-2xl transition group-hover:scale-110">
                          <Play size={20} fill="currentColor" className="ml-0.5" />
                        </span>
                      </button>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-bold text-white">{video.name}</p>
                    <p className="mt-1 text-xs text-white/40">Teacher introduction · BlankLearn</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-[28px] border border-dashed border-white/10 bg-white/[.03] p-10 text-center">
            <p className="text-sm font-semibold text-white/60">Teacher videos will appear here.</p>
            <p className="mt-1 text-xs text-white/35">Add approved videos to Realtime Database under VideoUploads.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function HowItWorks({ onDemo }: { onDemo: () => void }) {
  const items = [
    {
      num: "01",
      eyebrow: "Tell us what you need",
      title: "Choose the right learning path.",
      text: "Select class, board and the program that fits your child. No complicated setup.",
      icon: <GraduationCap size={19} />,
      accent: "from-blue-500 to-cyan-400",
    },
    {
      num: "02",
      eyebrow: "Pick your time",
      title: "Choose a one-hour slot.",
      text: "Select a fixed slot that works for your child. Matching is built around real teacher availability.",
      icon: <Clock3 size={19} />,
      accent: "from-violet-500 to-fuchsia-400",
    },
    {
      num: "03",
      eyebrow: "Smart matching",
      title: "Meet the right teacher.",
      text: "BlankLearn checks board, class, program, teaching mode and available capacity before matching.",
      icon: <Users size={19} />,
      accent: "from-emerald-500 to-teal-400",
    },
    {
      num: "04",
      eyebrow: "Experience it live",
      title: "Join the demo class.",
      text: "Meet the teacher, experience the classroom and understand the learning style before committing.",
      icon: <Video size={19} />,
      accent: "from-orange-500 to-amber-400",
    },
  ];

  return (
    <section id="how-it-works" className="relative overflow-hidden bg-[#f8fafc] py-24 sm:py-28">
      <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3.5 py-2 text-[10px] font-black uppercase tracking-[.2em] text-blue-600 shadow-sm">
                <Sparkles size={13} /> How it works
              </div>
              <h2 className="mt-5 text-4xl font-black leading-[1.02] tracking-[-.04em] text-slate-950 sm:text-6xl">
                From first click
                <span className="text-blue-600"> to first class.</span>
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                A simple journey for parents and students, with the complexity handled behind the scenes.
              </p>
            </div>

            <div className="hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:block">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Built around</p>
              <p className="mt-1 text-sm font-black text-slate-900">Class · Board · Program · Slot</p>
            </div>
          </div>
        </Reveal>

        <div className="relative mt-14">
          <div className="absolute left-[12.5%] right-[12.5%] top-[104px] hidden h-px bg-gradient-to-r from-blue-200 via-violet-200 to-orange-200 lg:block" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item, index) => (
              <Reveal key={item.num}>
                <article className="group relative h-full overflow-hidden rounded-[28px] border border-slate-200/90 bg-white p-6 shadow-[0_14px_45px_rgba(15,23,42,.06)] transition duration-500 hover:-translate-y-2 hover:border-slate-300 hover:shadow-[0_25px_65px_rgba(15,23,42,.11)]">
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.accent} opacity-80`} />

                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-black tracking-widest text-blue-600">{item.num}</span>
                    <span className="text-[10px] font-bold text-slate-300">0{index + 1}/04</span>
                  </div>

                  <div className="relative mt-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 transition duration-500 group-hover:scale-110 group-hover:bg-slate-950 group-hover:text-white">
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${item.accent} opacity-0 blur-md transition duration-500 group-hover:opacity-25`} />
                    <span className="relative">{item.icon}</span>
                  </div>

                  <p className="mt-7 text-[10px] font-black uppercase tracking-[.17em] text-slate-400">{item.eyebrow}</p>
                  <h3 className="mt-2 text-xl font-black leading-tight tracking-tight text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-xs leading-6 text-slate-500">{item.text}</p>

                  <div className="mt-7 flex items-center gap-2 text-[11px] font-black text-slate-400 transition group-hover:text-slate-900">
                    <span className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${item.accent}`} />
                    BlankLearn matching layer
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal>
          <div className="mt-8 overflow-hidden rounded-[30px] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_25px_70px_rgba(15,23,42,.14)] sm:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-blue-300">
                  <ShieldCheck size={19} />
                </div>
                <div>
                  <p className="text-sm font-black">The important part happens behind the scenes.</p>
                  <p className="mt-1 max-w-2xl text-xs leading-5 text-white/45">
                    We use your class, board, program, teaching mode and selected slot to find an eligible teacher and available batch.
                  </p>
                </div>
              </div>
              <button onClick={onDemo} className="shrink-0 rounded-xl bg-white px-5 py-3 text-xs font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-blue-50">
                Start with a demo <ArrowRight className="ml-1 inline" size={14} />
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Programs({ onDemo }: { onDemo: () => void }) {
  return (
    <section id="programs" className="bg-[#f7f8fb] py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-600">Demo programs</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Start with what your child needs.</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-500">The initial demo experience focuses on three simple choices. More programs can be added later without changing the booking experience.</p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {DEMO_PROGRAMS.map((program, i) => (
            <Reveal key={program.title}>
              <article className={`group relative h-full overflow-hidden rounded-[28px] border p-7 transition duration-500 hover:-translate-y-1 ${i === 2 ? "border-blue-200 bg-slate-950 text-white shadow-[0_25px_60px_rgba(15,23,42,.14)]" : "border-slate-200 bg-white text-slate-950"}`}>
                <div className={`grid h-11 w-11 place-items-center rounded-2xl ${i === 2 ? "bg-white/10 text-blue-300" : "bg-blue-50 text-blue-600"}`}>
                  {i === 0 ? <BookOpen size={19} /> : i === 1 ? <Sparkles size={19} /> : <Zap size={19} />}
                </div>
                <h3 className="mt-8 text-xl font-black">{program.title}</h3>
                <p className={`mt-3 text-sm leading-6 ${i === 2 ? "text-white/55" : "text-slate-500"}`}>{program.text}</p>
                <button onClick={onDemo} className={`mt-8 text-xs font-black ${i === 2 ? "text-blue-300" : "text-blue-600"}`}>
                  Book this demo <ArrowRight className="ml-1 inline transition group-hover:translate-x-1" size={14} />
                </button>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing({ onDemo }: { onDemo: () => void }) {
  const plans = [
    { duration: "1 month", weeks: "Flexible start", prices: [1500, 2500], saving: "Monthly" },
    { duration: "3 months", weeks: "Save on 3 months", prices: [4200, 7000], saving: "Save ₹300 / ₹500" },
    { duration: "6 months", weeks: "Best long-term value", prices: [8100, 13500], saving: "Best value" },
  ];
  const included = [
    "Small batch live classes",
    "Teacher–parent communication",
    "Student and parent dashboards",
    "Schedule, reminders and attendance",
    "Homework, assignments and study PDFs",
    "Class recordings and doubt support",
    "Teacher feedback and progress updates",
  ];
  const premium = [
    "Monday–Saturday live classes",
    "Extra practice and revision sessions",
    "Weekly tests and performance reports",
    "Dedicated doubt-solving sessions",
    "Personalized improvement plan",
    "Monthly parent–teacher interaction",
    "Exam preparation support",
  ];

  return (
    <section id="pricing" className="relative overflow-hidden bg-[#f7f9fd] py-24 sm:py-28">
      <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[.2em] text-blue-700 shadow-sm">
              <Sparkles size={13} /> Simple, transparent plans
            </div>
            <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-.04em] text-slate-950 sm:text-6xl">
              The right rhythm.
              <span className="block text-blue-600">A clearer way to grow.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Choose three or six live learning days each week, then save with a 3 or 6 month plan. Every class is taught live in a small group.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid items-stretch gap-5 lg:grid-cols-3">
          {plans.map((plan, planIndex) => (
            <Reveal key={plan.duration}>
              <article className={`premium-card relative h-full overflow-hidden rounded-[30px] border bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,.07)] sm:p-7 ${planIndex === 2 ? "border-indigo-300 ring-2 ring-indigo-100" : "border-slate-200"}`}>
                {planIndex === 2 && <div className="absolute right-5 top-5 rounded-full bg-indigo-600 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] text-white shadow-lg shadow-indigo-600/20">Best value</div>}
                <div className="flex items-center gap-3">
                  <div className={`grid h-12 w-12 place-items-center rounded-2xl ${planIndex === 2 ? "bg-indigo-600 text-white" : "bg-blue-50 text-blue-700"}`}>
                    {planIndex === 2 ? <GraduationCap size={22} /> : <CalendarDays size={20} />}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[.15em] text-slate-400">{plan.weeks}</p>
                    <h3 className="mt-0.5 text-2xl font-black tracking-tight text-slate-950">{plan.duration}</h3>
                  </div>
                </div>

                <div className="mt-7 space-y-3">
                  {plan.prices.map((price, frequencyIndex) => {
                    const frequency = frequencyIndex === 0 ? "3 days / week" : "6 days / week";
                    const monthly = Math.round(price / (planIndex === 0 ? 1 : planIndex === 1 ? 3 : 6));
                    return (
                      <div key={frequency} className={`rounded-2xl border p-4 ${frequencyIndex === 1 && planIndex === 2 ? "border-indigo-200 bg-indigo-50/80" : "border-slate-100 bg-slate-50/80"}`}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-bold text-slate-600">{frequency}</span>
                          {frequencyIndex === 1 && planIndex > 0 && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-emerald-700">Intensive</span>}
                        </div>
                        <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
                          <span className="text-3xl font-black tracking-tight text-slate-950">₹{price.toLocaleString("en-IN")}</span>
                          <span className="text-[11px] font-semibold text-slate-400">/{plan.duration.replace(" ", "-")}</span>
                        </div>
                        {planIndex > 0 && <p className="mt-1 text-[10px] font-semibold text-slate-500">≈ ₹{monthly.toLocaleString("en-IN")} per month · {price === 4200 ? "₹300" : price === 7000 ? "₹500" : price === 8100 ? "₹900" : "₹1,500"} saved</p>}
                      </div>
                    );
                  })}
                </div>

                <button onClick={onDemo} className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-xs font-black transition hover:-translate-y-0.5 ${planIndex === 2 ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700" : "bg-slate-950 text-white hover:bg-blue-700"}`}>
                  Find my class <ArrowRight size={15} />
                </button>
                <p className="mt-3 text-center text-[9px] font-medium text-slate-400">Book a demo first · Choose your class and schedule</p>
              </article>
            </Reveal>
          ))}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Check size={19} /></div>
                <div><h3 className="font-black text-slate-950">Included with every plan</h3><p className="mt-0.5 text-[11px] text-slate-500">Everything needed for steady learning.</p></div>
              </div>
              <ul className="mt-5 grid gap-x-5 gap-y-3 sm:grid-cols-2">
                {included.map((feature) => <li key={feature} className="flex items-start gap-2 text-[11px] font-medium leading-5 text-slate-600"><Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />{feature}</li>)}
              </ul>
            </div>
          </Reveal>
          <Reveal>
            <div className="relative h-full overflow-hidden rounded-[28px] bg-slate-950 p-6 text-white shadow-[0_22px_60px_rgba(15,23,42,.16)] sm:p-7">
              <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-indigo-500/25 blur-3xl" />
              <div className="relative flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-400/15 text-indigo-300"><Zap size={19} /></div>
                <div><h3 className="font-black">For students ready to go further</h3><p className="mt-0.5 text-[11px] text-white/50">Choose 6 days a week for a more intensive routine.</p></div>
              </div>
              <ul className="relative mt-5 grid gap-x-5 gap-y-3 sm:grid-cols-2">
                {premium.map((feature) => <li key={feature} className="flex items-start gap-2 text-[11px] font-medium leading-5 text-white/75"><Check size={14} className="mt-0.5 shrink-0 text-indigo-300" />{feature}</li>)}
              </ul>
            </div>
          </Reveal>
        </div>

        <p className="mt-6 text-center text-[10px] leading-5 text-slate-400">Final class availability and schedule are confirmed when you book. A demo helps us match your child with the right teacher and small batch.</p>
      </div>
    </section>
  );
}

function WhyBlankLearn({ onDemo }: { onDemo: () => void }) {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:px-8">
        <Reveal>
          <div className="lg:sticky lg:top-28">
            <p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-600">Why BlankLearn</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">More room for questions. More room to learn.</h2>
            <p className="mt-5 max-w-lg text-sm leading-6 text-slate-500">
              BlankLearn is designed around live interaction rather than simply putting another video in front of a student.
            </p>
            <button onClick={onDemo} className="mt-7 rounded-xl bg-blue-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">
              Experience a demo
            </button>
          </div>
        </Reveal>

        <div className="space-y-4">
          {[
            ["Small live groups", "Group demos are capped at 5 students, keeping the classroom intentionally small."],
            ["Board + class matching", "The booking flow uses the student's class and board when looking for an eligible teacher."],
            ["Fixed one-hour slots", "Teachers work with predefined one-hour availability windows so scheduling stays clear."],
            ["Real teacher interaction", "Students can ask questions, respond, practise and participate during the live class."],
          ].map(([title, text], i) => (
            <Reveal key={title}>
              <div className="group rounded-[24px] border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/40">
                <div className="flex gap-5">
                  <div className="font-mono text-xs font-bold text-blue-600">0{i + 1}</div>
                  <div>
                    <h3 className="text-lg font-black text-slate-950">{title}</h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">{text}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="bg-[#f7f8fb] py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal>
          <div className="text-center">
            <p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-600">FAQ</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Questions parents usually ask.</h2>
          </div>
        </Reveal>

        <div className="mt-10 space-y-3">
          {FAQS.map(([q, a], i) => (
            <div key={q} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <button onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between gap-5 p-5 text-left">
                <span className="text-sm font-bold text-slate-950">{q}</span>
                <ChevronDown className={`shrink-0 transition ${open === i ? "rotate-180 text-blue-600" : "text-slate-400"}`} size={17} />
              </button>
              {open === i && <div className="border-t border-slate-100 px-5 pb-5 pt-4 text-sm leading-6 text-slate-500">{a}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ onDemo }: { onDemo: () => void }) {
  return (
    <section className="relative overflow-hidden bg-slate-950 py-24 text-white">
      <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-blue-300"><Sparkles size={19} /></div>
        <h2 className="mt-7 text-4xl font-black tracking-tight sm:text-6xl">Let your child experience the class first.</h2>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-white/50">Choose a class, pick a slot and see what a focused live classroom feels like.</p>
        <button onClick={onDemo} className="mt-8 rounded-2xl bg-white px-7 py-4 text-sm font-black text-slate-950 transition hover:-translate-y-1 hover:bg-blue-50">
          Book a live demo <ArrowRight className="ml-1 inline" size={16} />
        </button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#080d16] px-4 py-14 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 md:grid-cols-[1.4fr_.7fr_.7fr_1.1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <BrandLogo className="h-9 w-9 rounded-xl object-cover" />
              <span className="text-lg font-black">BlankLearn</span>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/40">Live learning designed around small groups, real teachers and a simpler path from curiosity to confidence.</p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-white/35">Explore</p>
            <div className="mt-4 space-y-3 text-sm text-white/60">
              <Link className="block hover:text-white" href="/how-it-works">How it works</Link>
              <Link className="block hover:text-white" href="/teachers">Teachers</Link>
              <Link className="block hover:text-white" href="/pricing">Pricing</Link>
              <Link className="block hover:text-white" href="/faq">FAQ</Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-white/35">Account</p>
            <div className="mt-4 space-y-3 text-sm text-white/60">
              <Link className="block hover:text-white" href="/student-auth">Student login</Link>
              <Link className="block hover:text-white" href="/student-auth">Student signup</Link>
              <Link className="block hover:text-white" href="/contact">Contact</Link>
              <Link className="block hover:text-white" href="/privacy">Privacy</Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[.04] p-6">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-blue-300">For teachers</p>
            <h3 className="mt-3 text-xl font-black">Teach with BlankLearn.</h3>
            <p className="mt-2 text-sm leading-6 text-white/45">Create your profile, add the boards, classes, subjects and one-hour slots you teach.</p>
            <Link href="/teacher-auth" className="mt-5 inline-flex items-center rounded-xl bg-white px-4 py-2.5 text-xs font-black text-slate-950 hover:bg-blue-50">
              Apply as a teacher <ArrowRight className="ml-1" size={14} />
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col justify-between gap-4 border-t border-white/10 pt-6 text-[11px] text-white/30 sm:flex-row">
          <p>© 2026 BlankLearn. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/terms" className="hover:text-white/70">Terms</Link>
            <Link href="/privacy" className="hover:text-white/70">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <>
      <style jsx global>{`
        html { scroll-behavior: smooth; }
        body { background: #fff; }
        .hero-grid {
          background-image:
            linear-gradient(rgba(15,23,42,.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15,23,42,.045) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: linear-gradient(to bottom, black, transparent 82%);
        }
        .hero-underline {
          transform: rotate(-1.5deg);
          transform-origin: left center;
        }
        .premium-card { transform: translateZ(0); }
        .premium-card::before { content: ""; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(120deg, transparent 25%, rgba(255,255,255,.45) 50%, transparent 75%); transform: translateX(-120%); transition: transform .8s ease; }
        .premium-card:hover::before { transform: translateX(120%); }
        .float-card { animation: floatA 5s ease-in-out infinite; }
        .float-card-delayed { animation: floatB 6s ease-in-out infinite; }
        .reveal { animation: reveal .7s cubic-bezier(.22,1,.36,1) both; }
        .reveal:nth-child(2) { animation-delay: .06s; }
        .reveal:nth-child(3) { animation-delay: .12s; }
        .reveal:nth-child(4) { animation-delay: .18s; }
        @keyframes reveal {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatA {
          0%,100% { transform: translateY(0) rotate(-1deg); }
          50% { transform: translateY(-9px) rotate(0deg); }
        }
        @keyframes floatB {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
        }
      `}</style>

      <div className="min-h-screen bg-white text-slate-950">
        <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
        <Navbar onDemo={() => setDemoOpen(true)} />
        <main>
          <Hero onDemo={() => setDemoOpen(true)} />
          <VideoShowcase />
          <HowItWorks onDemo={() => setDemoOpen(true)} />
          <Programs onDemo={() => setDemoOpen(true)} />
          <Pricing onDemo={() => setDemoOpen(true)} />
          <WhyBlankLearn onDemo={() => setDemoOpen(true)} />
          <FAQ />
          <FinalCTA onDemo={() => setDemoOpen(true)} />
        </main>
        <Footer />
      </div>
    </>
  );
}
