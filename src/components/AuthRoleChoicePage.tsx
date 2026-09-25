"use client";

import Link from "next/link";
import {
  ArrowRight,
  GraduationCap,
  Users,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Video,
  CheckCircle2,
} from "lucide-react";

export default function AuthRoleChoicePage({
  mode = "login",
}: {
  mode?: "login" | "signup";
}) {
  const isSignup = mode === "signup";

  return (
    <main className="min-h-screen bg-[#f6f8fc] text-slate-950">
      <div className="relative flex min-h-screen items-center overflow-hidden px-4 py-8 sm:px-6 lg:px-10">

        {/* Background glow */}
        <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,.10)]">

          <div className="grid lg:grid-cols-[.82fr_1.18fr]">

            {/* LEFT */}
            <section className="relative hidden overflow-hidden bg-[#090e18] p-10 text-white lg:flex lg:min-h-[680px] lg:flex-col lg:justify-between lg:p-12">

              <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
              <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />

              <Link
                href="/"
                className="relative z-10 inline-flex w-fit items-center text-xl font-black tracking-tight"
              >
                BlankLearn
                <span className="text-indigo-400">.</span>
              </Link>

              <div className="relative z-10">

                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-3 py-2 text-[10px] font-black uppercase tracking-[.18em] text-indigo-200">
                  <Sparkles size={13} />
                  {isSignup ? "Create your account" : "Welcome back"}
                </div>

                <h1 className="mt-6 max-w-lg text-5xl font-black leading-[1.02] tracking-[-.045em]">
                  One platform.
                  <br />
                  Two focused
                  <br />
                  experiences.
                </h1>

                <p className="mt-6 max-w-md text-sm leading-7 text-white/45">
                  Students get a focused learning workspace.
                  Teachers get a professional teaching, availability
                  and verification workspace.
                </p>

                <div className="mt-9 grid grid-cols-2 gap-3">

                  <Feature
                    icon={<BookOpen size={17} />}
                    title="Live learning"
                  />

                  <Feature
                    icon={<Video size={17} />}
                    title="Live classes"
                  />

                  <Feature
                    icon={<Users size={17} />}
                    title="Small groups"
                  />

                  <Feature
                    icon={<ShieldCheck size={17} />}
                    title="Verified profiles"
                  />

                </div>
              </div>

              <p className="relative z-10 text-[11px] text-white/25">
                BlankLearn · Live learning platform
              </p>
            </section>

            {/* RIGHT */}
            <section className="flex min-h-[680px] items-center p-6 sm:p-10 lg:p-14">

              <div className="mx-auto w-full max-w-2xl">

                {/* Mobile logo */}
                <div className="mb-10 lg:hidden">
                  <Link
                    href="/"
                    className="text-xl font-black tracking-tight"
                  >
                    BlankLearn
                    <span className="text-indigo-600">.</span>
                  </Link>
                </div>

                <div>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <Sparkles size={21} />
                  </div>

                  <p className="text-[11px] font-black uppercase tracking-[.2em] text-indigo-600">
                    {isSignup ? "Create account" : "Continue"}
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-[-.025em] sm:text-4xl">
                    How will you use BlankLearn?
                  </h2>

                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
                    Choose your experience. You will be taken directly to
                    the dedicated login and signup flow for your role.
                  </p>
                </div>

                {/* ROLE CARDS */}
                <div className="mt-9 grid gap-4 sm:grid-cols-2">

                  {/* STUDENT */}
                  <Link
                    href="/student-auth"
                    className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 transition-all duration-500 hover:-translate-y-2 hover:border-indigo-300 hover:shadow-[0_25px_60px_rgba(79,70,229,.13)]"
                  >
                    <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-indigo-100/70 blur-3xl transition duration-500 group-hover:bg-indigo-200/80" />

                    <div className="relative">

                      <div className="flex items-center justify-between">

                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition duration-500 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white">
                          <GraduationCap size={22} />
                        </div>

                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-300 transition duration-300 group-hover:translate-x-1 group-hover:border-indigo-200 group-hover:text-indigo-600">
                          <ArrowRight size={17} />
                        </div>

                      </div>

                      <p className="mt-7 text-[10px] font-black uppercase tracking-[.18em] text-indigo-600">
                        For learners
                      </p>

                      <h3 className="mt-2 text-2xl font-black tracking-tight">
                        I&apos;m a Student
                      </h3>

                      <p className="mt-3 text-xs leading-6 text-slate-500">
                        Join live classes, book demos, complete homework,
                        take quizzes and track your learning progress.
                      </p>

                      <div className="mt-6 space-y-2">

                        <MiniFeature text="Live teacher-led classes" />
                        <MiniFeature text="Homework & quizzes" />
                        <MiniFeature text="Learning progress" />

                      </div>

                      <div className="mt-7 flex items-center gap-2 text-[11px] font-black text-indigo-600">
                        <CheckCircle2 size={14} />
                        Student workspace
                      </div>

                    </div>
                  </Link>

                  {/* TEACHER */}
                  <Link
                    href="/teacher-auth"
                    className="group relative overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950 p-6 text-white transition-all duration-500 hover:-translate-y-2 hover:border-slate-700 hover:shadow-[0_25px_65px_rgba(15,23,42,.25)]"
                  >
                    <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl transition duration-500 group-hover:bg-indigo-500/30" />

                    <div className="relative">

                      <div className="flex items-center justify-between">

                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-indigo-300 transition duration-500 group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white">
                          <Users size={22} />
                        </div>

                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/30 transition duration-300 group-hover:translate-x-1 group-hover:border-white/20 group-hover:text-white">
                          <ArrowRight size={17} />
                        </div>

                      </div>

                      <p className="mt-7 text-[10px] font-black uppercase tracking-[.18em] text-indigo-300">
                        For educators
                      </p>

                      <h3 className="mt-2 text-2xl font-black tracking-tight">
                        I&apos;m a Teacher
                      </h3>

                      <p className="mt-3 text-xs leading-6 text-white/45">
                        Create your professional teaching account and
                        continue directly to your detailed application.
                      </p>

                      <div className="mt-6 space-y-2">

                        <MiniFeature
                          dark
                          text="Teaching profile"
                        />

                        <MiniFeature
                          dark
                          text="Classes & subjects"
                        />

                        <MiniFeature
                          dark
                          text="Availability & verification"
                        />

                      </div>

                      <div className="mt-7 flex items-center gap-2 text-[11px] font-black text-indigo-300">
                        <ShieldCheck size={14} />
                        Teacher workspace
                      </div>

                    </div>
                  </Link>

                </div>

                <div className="mt-8 flex items-center justify-between">

                  <Link
                    href="/"
                    className="text-xs font-bold text-slate-400 transition hover:text-slate-900"
                  >
                    ← Back to BlankLearn
                  </Link>

                  <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400">
                    <ShieldCheck size={13} />
                    Secure authentication
                  </div>

                </div>

              </div>
            </section>

          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes authFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </main>
  );
}

function Feature({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.045] p-4 transition duration-300 hover:-translate-y-1 hover:bg-white/[.07]">
      <div className="text-indigo-300">{icon}</div>
      <p className="mt-3 text-xs font-bold text-white/75">{title}</p>
    </div>
  );
}

function MiniFeature({
  text,
  dark = false,
}: {
  text: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 text-[11px] ${
        dark ? "text-white/55" : "text-slate-500"
      }`}
    >
      <CheckCircle2
        size={13}
        className={dark ? "text-emerald-400" : "text-emerald-600"}
      />
      {text}
    </div>
  );
}