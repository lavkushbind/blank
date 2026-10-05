"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { CalendarDays, Check, Clock3, GraduationCap, Loader2, Sparkles } from "lucide-react";

import { auth } from "@/lib/firebase/client";
import LiveKitClassroom from "@/components/classroom/LiveKitClassroom";
import { BrandLogo } from "@/components/BrandLogo";

type SessionStatus =
  | "SCHEDULED"
  | "PREPARING"
  | "OPEN_FOR_JOIN"
  | "PAUSED"
  | "TECHNICAL_ISSUE"
  | "PROCESSING"
  | "COMPLETED"
  | "LIVE"
  | "ENDED"
  | "CANCELLED";

type SessionResponse = {
  success: boolean;
  session?: {
    id: string;
    status: SessionStatus;
    studentJoinAllowed?: boolean;
    studentJoinMessage?: string;
    title?: string;
    subject?: string;
    batchId?: string;
    isDemo?: boolean;
    demoBookingId?: string | null;
    endedAt?: string | null;
    demoSessionIndex?: number;
    demoSessionCount?: number;
    demoSessionIds?: string[];
    demoStatus?: string;
    demoCompletedAt?: string | null;
    role?: "TEACHER" | "STUDENT";
  };
  error?: string;
  message?: string;
};

type TokenResponse = {
  success: boolean;
  token?: string;
  serverUrl?: string;
  participantName?: string;
  session?: {
    id: string;
    status: SessionStatus;
    role: "TEACHER" | "STUDENT";
    participantName: string;
    title?: string;
    subject?: string;
    className?: string;
  };
  error?: string;
  message?: string;
};

async function readJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export default function StudentClassroomPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();

  const sessionId = String(params?.sessionId || "");

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinAllowed, setJoinAllowed] = useState(false);
  const [joinMessage, setJoinMessage] = useState("");
  const [error, setError] = useState("");
  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("SCHEDULED");
  const [sessionTitle, setSessionTitle] =
    useState("Live Class");
  const [subject, setSubject] = useState("");
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [isDemo, setIsDemo] = useState(false);
  const [demoBookingId, setDemoBookingId] = useState("");
  const [demoSessionIndex, setDemoSessionIndex] = useState(0);
  const [demoSessionCount, setDemoSessionCount] = useState(1);
  const [demoSessionIds, setDemoSessionIds] = useState<string[]>([]);
  const [demoStatus, setDemoStatus] = useState("ACTIVE");
  const [offerEndsAt, setOfferEndsAt] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);

  const getIdToken = useCallback(async () => {
    const user = auth.currentUser;

    if (!user) {
      throw new Error("You are not logged in.");
    }

    return user.getIdToken();
  }, []);

  const fetchSessionStatus = useCallback(async () => {
    if (!sessionId) {
      throw new Error("Invalid session ID.");
    }

    const idToken = await getIdToken();

    const response = await fetch(
      `/api/class_sessions/${encodeURIComponent(sessionId)}/status`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        cache: "no-store",
      },
    );

    const data: SessionResponse = await readJson(response);

    if (!response.ok || !data.success || !data.session) {
      throw new Error(
        data.message ||
          data.error ||
          "Unable to load class.",
      );
    }

    setSessionStatus(data.session.status);
    setJoinAllowed(data.session.studentJoinAllowed === true);
    setJoinMessage(data.session.studentJoinMessage || "");
    setSessionTitle(data.session.title || "Live Class");
    setSubject(data.session.subject || "");
    setIsDemo(Boolean(data.session.isDemo));
    setDemoBookingId(data.session.demoBookingId || "");
    setDemoSessionIndex(data.session.demoSessionIndex || 0);
    setDemoSessionCount(data.session.demoSessionCount || 1);
    setDemoSessionIds(data.session.demoSessionIds || []);
    setDemoStatus(data.session.demoStatus || "ACTIVE");
    const completedAt = data.session.demoCompletedAt ? new Date(data.session.demoCompletedAt).getTime() : 0;
    setOfferEndsAt(data.session.isDemo && data.session.demoStatus === "COMPLETED" && completedAt > 0 ? completedAt + 72 * 60 * 60 * 1000 : null);

    return data.session;
  }, [getIdToken, sessionId]);

  const joinClass = useCallback(async () => {
    if (!sessionId || joining || token) return;

    setJoining(true);
    setError("");

    try {
      const current = await fetchSessionStatus();

      if (!current.studentJoinAllowed) {
        return;
      }

      const idToken = await getIdToken();

      const response = await fetch(
        `/api/livekit/token?sessionId=${encodeURIComponent(sessionId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          cache: "no-store",
        },
      );

      const data: TokenResponse = await readJson(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            data.error ||
            "Unable to join classroom.",
        );
      }

      if (!data.token || !data.serverUrl) {
        throw new Error(
          "Live classroom credentials were not returned.",
        );
      }

      if (!data.session || data.session.role !== "STUDENT") {
        throw new Error(
          "This classroom is not available for student access.",
        );
      }

      setToken(data.token);
      setServerUrl(data.serverUrl);
      setSessionStatus(data.session.status);
      setTeacherName(data.session.participantName || "");
    } catch (err) {
      console.error("Student classroom error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to join classroom.",
      );
    } finally {
      setJoining(false);
    }
  }, [fetchSessionStatus, getIdToken, joining, sessionId, token]);

  useEffect(() => {
    if (!sessionId) {
      setError("Invalid session ID.");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace(
          `/student-auth?redirect=/classroom/${encodeURIComponent(sessionId)}`,
        );
        return;
      }

      void (async () => {
        try {
          await fetchSessionStatus();
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load classroom.",
          );
        } finally {
          setLoading(false);
        }
      })();
    });

    return () => unsubscribe();
  }, [fetchSessionStatus, router, sessionId]);

  useEffect(() => {
    if (loading || token || !sessionId) return;

    const terminalStatuses: SessionStatus[] = [
      "ENDED",
      "CANCELLED",
    ];

    if (terminalStatuses.includes(sessionStatus)) return;

    const interval = window.setInterval(() => {
      void (async () => {
        try {
          const current = await fetchSessionStatus();

          if (current.studentJoinAllowed) {
            await joinClass();
          }
        } catch (err) {
          console.error("Classroom polling error:", err);
        }
      })();
    }, 4000);

    return () => window.clearInterval(interval);
  }, [
    fetchSessionStatus,
    joinClass,
    loading,
    sessionId,
    sessionStatus,
    token,
  ]);

  useEffect(() => {
    if (!token || !sessionId || sessionStatus === "ENDED" || sessionStatus === "CANCELLED") return;
    const interval = window.setInterval(() => {
      void fetchSessionStatus().then((status) => {
        if (["ENDED", "COMPLETED", "PROCESSING", "CANCELLED"].includes(status.status)) {
          setToken("");
          setServerUrl("");
        }
      }).catch((pollError) => console.error("Class end polling error:", pollError));
    }, 5000);
    return () => window.clearInterval(interval);
  }, [fetchSessionStatus, sessionId, sessionStatus, token]);

  useEffect(() => {
    if (!offerEndsAt) return;
    const update = () => setRemainingMs(Math.max(0, offerEndsAt - Date.now()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [offerEndsAt]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <Loader2
            size={34}
            className="mx-auto animate-spin text-blue-400"
          />
          <h1 className="mt-4 text-lg font-black">
            Loading class
          </h1>
          <p className="mt-2 text-sm text-white/40">
            Checking classroom availability...
          </p>
        </div>
      </main>
    );
  }

  if (token && serverUrl) {
    return (
      <main className="min-h-screen bg-slate-950">
        <LiveKitClassroom
          token={token}
          serverUrl={serverUrl}
          role="STUDENT"
          sessionId={sessionId}
          subject={subject}
          lessonTitle={sessionTitle}
          teacherName={teacherName}
          onLeave={() => router.push("/hub")}
        />
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-xl font-black text-red-300">
            !
          </div>
          <h1 className="mt-5 text-xl font-black">
            Unable to join class
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/45">
            {error}
          </p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setError("");
                void joinClass();
              }}
              className="flex-1 rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => router.push("/hub")}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white"
            >
              Back
            </button>
          </div>
        </div>
      </main>
    );
  }

  const isOpen =
    joinAllowed;

  const isTerminal = ["ENDED", "COMPLETED", "PROCESSING", "CANCELLED"].includes(sessionStatus);

  if (isTerminal) {
    if (sessionStatus === "ENDED" && isDemo) {
      if (demoStatus !== "COMPLETED" && demoSessionIds[demoSessionIndex + 1]) {
        return (
          <main className="flex min-h-screen items-center justify-center bg-[#f5f7ff] px-5 py-10 text-slate-950">
            <section className="w-full max-w-xl rounded-[30px] border border-white bg-white p-8 text-center shadow-[0_30px_100px_rgba(30,41,90,.14)] sm:p-10">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><Check size={24} /></div>
              <p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-indigo-600">Your 3-day demo</p>
              <h1 className="mt-2 text-3xl font-black">Day {demoSessionIndex + 1} complete</h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">Thanks for joining today. Your demo continues with one live class each day. Join your next classroom from the dashboard when your teacher starts it.</p>
              <div className="mt-7 flex items-center justify-center gap-2 rounded-2xl bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-800"><CalendarDays size={17} /> {demoSessionCount - demoSessionIndex - 1} demo session{demoSessionCount - demoSessionIndex - 1 === 1 ? "" : "s"} remaining</div>
              <button type="button" onClick={() => router.push("/hub")} className="mt-5 w-full rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white">Back to your dashboard</button>
            </section>
          </main>
        );
      }
      const hours = Math.floor(remainingMs / (60 * 60 * 1000));
      const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((remainingMs % (60 * 1000)) / 1000);
      const offerExpired = offerEndsAt !== null && remainingMs <= 0;
      const coursePlans = [
        { id: "M1_D3", term: "1 month", cadence: "3 days / week", price: 1500, regular: 1500 },
        { id: "M3_D3", term: "3 months", cadence: "3 days / week", price: offerExpired ? 4500 : 4200, regular: 4500 },
        { id: "M6_D3", term: "6 months", cadence: "3 days / week", price: offerExpired ? 9000 : 8100, regular: 9000 },
        { id: "M1_D6", term: "1 month", cadence: "6 days / week", price: 2500, regular: 2500 },
        { id: "M3_D6", term: "3 months", cadence: "6 days / week", price: offerExpired ? 7500 : 7000, regular: 7500 },
        { id: "M6_D6", term: "6 months", cadence: "6 days / week", price: offerExpired ? 15000 : 13500, regular: 15000 },
      ];

      return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f7ff] px-4 py-10 text-slate-950 sm:px-6">
          <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-indigo-300/25 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-sky-300/25 blur-3xl" />
          <section className="relative w-full max-w-5xl overflow-hidden rounded-[32px] border border-white bg-white shadow-[0_30px_100px_rgba(30,41,90,.16)]">
            <div className="relative overflow-hidden bg-slate-950 px-6 py-8 text-white sm:px-10 sm:py-10">
              <div className="absolute -right-10 -top-24 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />
              <div className="relative inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-emerald-200">
                <Check size={13} /> Demo complete
              </div>
              <h1 className="relative mt-5 text-3xl font-black tracking-tight sm:text-4xl">Keep the learning going.</h1>
              <p className="relative mt-3 max-w-lg text-sm leading-6 text-white/65">
                You&apos;ve experienced a live BlankLearn class. Continue with a small batch, a teacher who fits your child, and a schedule built for steady progress.
              </p>
            </div>

            <div className="p-6 sm:p-10">
              {!offerExpired && (
                <div className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-amber-600 shadow-sm"><Sparkles size={19} /></div>
                    <div>
                      <p className="text-sm font-black text-slate-900">Your 3-day demo offer</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">Take the time to decide. Your 3-month and 6-month savings are available for 3 days after your final demo class.</p>
                    </div>
                  </div>
                  {offerEndsAt ? (
                    <div className="flex shrink-0 items-center gap-2 rounded-xl border border-amber-200/80 bg-white/80 px-3 py-2 text-amber-800">
                      <Clock3 size={15} />
                      <span className="font-mono text-sm font-black tabular-nums">{String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wide">left</span>
                    </div>
                  ) : <span className="text-[10px] font-bold text-amber-800">Available for 3 days</span>}
                </div>
              )}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-100 text-indigo-700"><GraduationCap size={18} /></div>
                  <div><p className="text-xs font-black text-slate-900">Small batch learning</p><p className="mt-1 text-[10px] leading-4 text-slate-500">Live lessons with room to ask and grow.</p></div>
                </div>
                <div className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700"><Check size={17} /></div>
                  <div><p className="text-xs font-black text-slate-900">Choose your weekly rhythm</p><p className="mt-1 text-[10px] leading-4 text-slate-500">3 or 6 live learning days per week.</p></div>
                </div>
              </div>

              <div className="mt-8">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-indigo-600">Choose your plan</p>
                    <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Continue with the same class path</h2>
                  </div>
                  {!offerExpired && <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-wide text-emerald-700"><Sparkles size={12} /> Demo offer prices</span>}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {["3 days / week", "6 days / week"].map((cadence) => (
                    <div key={cadence} className={`rounded-2xl border p-4 ${cadence.startsWith("6") ? "border-indigo-200 bg-indigo-50/40" : "border-slate-200 bg-slate-50/70"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-black text-slate-950">{cadence}</h3>
                        {cadence.startsWith("6") && <span className="rounded-full bg-indigo-600 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-white">Intensive</span>}
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {coursePlans.filter((plan) => plan.cadence === cadence).map((plan) => (
                          <div key={plan.id} className={`rounded-xl border bg-white p-2.5 ${plan.term === "6 months" && cadence.startsWith("6") ? "border-indigo-300 shadow-sm" : "border-slate-100"}`}>
                            <p className="text-[9px] font-bold text-slate-500">{plan.term}</p>
                            <p className="mt-1 text-base font-black tracking-tight text-slate-950">₹{plan.price.toLocaleString("en-IN")}</p>
                            {plan.price < plan.regular && <p className="mt-0.5 text-[8px] font-bold text-emerald-700">Save ₹{(plan.regular - plan.price).toLocaleString("en-IN")}</p>}
                            <button
                              type="button"
                              disabled={!demoBookingId}
                              onClick={() => router.push(`/billing?bookingId=${encodeURIComponent(demoBookingId)}&plan=${plan.id}&offerEndsAt=${offerEndsAt || ""}`)}
                              className="mt-2 w-full rounded-lg bg-slate-950 px-2 py-2 text-[9px] font-black text-white transition hover:bg-indigo-600 disabled:opacity-50"
                            >Choose
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {!demoBookingId && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-center text-xs font-semibold text-amber-800">Plan selection is unavailable because this session is not linked to a demo booking. Please contact support.</p>}
              <button type="button" onClick={() => router.push("/hub")} className="mt-3 w-full rounded-xl px-4 py-3 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800">Return to student hub</button>
              <p className="mt-4 text-center text-[9px] leading-4 text-slate-400">Your demo is complete. Plan availability and schedule are confirmed when you continue.</p>
            </div>
          </section>
        </main>
      );
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 font-black">
            <BrandLogo className="h-full w-full rounded-[inherit] object-cover" />
          </div>
          <h1 className="mt-5 text-2xl font-black">
            Class has ended
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/45">
            This classroom session is no longer available.
          </p>
          <button
            type="button"
            onClick={() => router.push("/hub")}
            className="mt-6 w-full rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950"
          >
            Back to Hub
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            isOpen
              ? "bg-emerald-400/10"
              : "bg-amber-400/10"
          }`}
        >
          <span
            className={`h-4 w-4 rounded-full ${
              isOpen
                ? "bg-emerald-400"
                : "animate-pulse bg-amber-400"
            }`}
          />
        </div>

        <span className="mt-6 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white/55">
          {isOpen
            ? !joinAllowed ? joinMessage : sessionStatus === "LIVE" ? "Teacher is in the live class" : "Teacher has opened the class"
            : "Waiting for teacher"}
        </span>

        <h1 className="mt-4 text-3xl font-black tracking-tight">
          {sessionTitle}
        </h1>

        {subject && (
          <p className="mt-2 text-sm font-bold text-blue-300">
            {subject}
          </p>
        )}

        <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-white/45">
          {isOpen
            ? sessionStatus === "LIVE" ? "The teacher has started teaching. Join the live class now." : "The classroom is ready. You can join now."
            : "The page is checking automatically. You will be able to join as soon as the teacher opens the class."}
        </p>

        {isOpen && (
          <button
            type="button"
            disabled={joining || !joinAllowed}
            onClick={() => void joinClass()}
            className="mt-7 w-full rounded-xl bg-white px-5 py-3.5 text-sm font-black text-slate-950 disabled:opacity-50"
          >
            {joining ? "Joining..." : joinAllowed ? "Join Class" : "Join opens at class time"}
          </button>
        )}

        <button
          type="button"
          onClick={() => router.push("/hub")}
          className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-black text-white hover:bg-white/10"
        >
          Back to Hub
        </button>
      </div>
    </main>
  );
}
