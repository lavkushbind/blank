"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePlatformSettings } from "@/lib/platform/client";
import Link from "next/link";
import { DemoPayment } from "@/components/DemoPayment";
import Image from "next/image";
import styles from "./hub.module.css";
import { studentAccess } from "@/lib/classroom/studentAccess";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  MessageCircle,
  Compass,
  Award,
  FileText,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Play,
  RefreshCw,
  Sparkles,
  UserRound,
  Video,
} from "lucide-react";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { auth, db } from "@/lib/firebase/client";

/* ========================================================================== */
/* TYPES                                                                      */
/* ========================================================================== */

type SessionStatus =
  | "SCHEDULED"
  | "PREPARING"
  | "OPEN_FOR_JOIN"
  | "LIVE"
  | "PAUSED"
  | "TECHNICAL_ISSUE"
  | "ENDED"
  | "PROCESSING"
  | "COMPLETED"
  | "CANCELLED";

interface Student {
  uid?: string;
  name?: string;
  email?: string;
  classNumber?: number;
  board?: string;
  photoURL?: string;
}

interface DemoBooking {
  id: string;

  studentId?: string;
  studentName?: string;

  teacherId?: string;
  teacherName?: string;

  batchId?: string;
  sessionId?: string;
  sessionIds?: string[];
  demoSessionIds?: string[];
  demoSessionCount?: number;
  demoStatus?: string;
  completedSessionIds?: string[];
  demoCompletedAt?: Session["endedAt"];
  demoBatchId?: string;

  classNumber?: number;
  board?: string;

  programId?: string;
  demoType?: "GROUP" | "INDIVIDUAL";

  subjects?: string[];

  date?: string;
  startTime?: string;
  endTime?: string;

  status?: string;
  paymentStatus?: string;
  membershipStatus?: string;

  finalPrice?: number;
  originalPrice?: number;
}

interface Session {
  id: string;

  teacherId?: string;
  teacherName?: string;
  type?: string;
  isDemo?: boolean;
  studentIds?: string[];

  batchId?: string;
  demoBatchId?: string;

  title?: string;
  subject?: string;

  classNumber?: number;
  board?: string;

  date?: string;
  startTime?: string;
  endTime?: string;

  status?: SessionStatus;

  roomName?: string;
  livekitRoomName?: string;
  liveRoomId?: string;
  endedAt?: { toDate?: () => Date } | Date | string | null;
  updatedAt?: { toDate?: () => Date } | Date | string | null;
  demoSessionIndex?: number;
}

/* ========================================================================== */
/* HELPERS                                                                    */
/* ========================================================================== */

function normalizeDate(value?: string) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseTimeToMinutes(value?: string) {
  if (!value) return 0;

  const parts = value.split(":");

  if (parts.length < 2) {
    return 0;
  }

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 0;
  }

  return hours * 60 + minutes;
}

function getDateTime(
  date?: string,
  time?: string
) {
  const parsedDate = normalizeDate(date);

  if (!parsedDate) {
    return Number.MAX_SAFE_INTEGER;
  }

  return (
    parsedDate.getTime() +
    parseTimeToMinutes(time) * 60 * 1000
  );
}

function formatDate(value?: string) {
  if (!value) {
    return "Date not set";
  }

  const date = normalizeDate(value);

  if (!date) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function timestampMillis(value: Session["endedAt"]) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") return new Date(value).getTime();
  if (value && typeof value.toDate === "function") return value.toDate().getTime();
  return 0;
}

function demoIsComplete(demo: DemoBooking, sessions: Session[]) {
  if (demo.demoStatus === "COMPLETED") return true;
  const ids = demo.sessionIds || demo.demoSessionIds || [];
  if (ids.length) {
    const linked = ids.map((id) => sessions.find((session) => session.id === id)).filter((session): session is Session => Boolean(session));
    return ids.length >= (demo.demoSessionCount || 1) && linked.length === ids.length && linked.every((session) => ["ENDED", "COMPLETED"].includes(String(session.status)));
  }
  if ((demo.demoSessionCount || 1) > 1) return false;
  const legacySession = sessions.find((session) => session.id === demo.sessionId || session.batchId === demo.batchId || session.demoBatchId === demo.batchId);
  return legacySession ? ["ENDED", "COMPLETED"].includes(String(legacySession.status)) : false;
}

function DemoPurchaseOffer({ bookingId, endedAt }: { bookingId: string; endedAt: Session["endedAt"] }) {
  const platform = usePlatformSettings();
  const endedAtMs = timestampMillis(endedAt);
  const expiresAt = endedAtMs > 0 ? endedAtMs + 72 * 60 * 60 * 1000 : 0;
  const [now, setNow] = useState(Date.now());
  const [daysPerWeek, setDaysPerWeek] = useState(3);

  useEffect(() => {
    if (!expiresAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const remaining = Math.max(0, expiresAt - now);
  const offerActive = platform.offersEnabled && expiresAt > 0 && remaining > 0;
  const daysLeft = Math.floor(remaining / 86400000);
  const hoursLeft = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const prices = Object.entries(platform.plans).map(([id,p]) => ({id,duration: p.months + (p.months === 1 ? " month" : " months"),days:p.classesPerWeek,regular:p.regular,offer:p.offer}));

  return (
    <div className={styles.plans}>
      <div className="flex flex-col gap-3 bg-slate-950 px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-400/15 text-indigo-200"><Sparkles size={19} /></span>
          <div><p className="text-sm font-semibold">Your 3-day demo offer</p><p className="mt-0.5 text-[10px] text-white/65">Take time to decide. Save on a 3 or 6-month plan after your demo.</p></div>
        </div>
        {offerActive && <div className="flex w-fit items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-amber-100"><Clock3 size={14} /><span className="text-xs font-semibold tabular-nums">{daysLeft ? `${daysLeft}d ` : ""}{hoursLeft}h {String(minutes).padStart(2, "0")}m</span><span className="text-[8px] font-semibold uppercase tracking-wider">remaining</span></div>}
      </div>
      <div className="p-4 sm:p-5">
        <PlanExplanation/>
        <div className={styles.planToggle} role="group" aria-label="Classes per week">{[3, 6].map((days) => <button type="button" key={days} aria-pressed={daysPerWeek === days} onClick={() => setDaysPerWeek(days)}>{days} days / week</button>)}</div>
        <div>
          {[daysPerWeek].map((days) => (
            <div key={days} className="rounded-2xl border border-slate-200/80 bg-white/90 p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-900">{days} days <span className="font-medium text-slate-400">/ week</span></p>
                {days === 6 && <span className="rounded-full bg-blue-50 px-2 py-1 text-[8px] font-semibold uppercase tracking-wide text-blue-800">More practice</span>}
              </div>
              <div className="mt-3 grid gap-2 min-[420px]:grid-cols-3">
                {prices.filter((plan) => plan.days === days).map((plan) => {
                  const amount = offerActive ? plan.offer : plan.regular;
                  return (
                    <div key={plan.id} className={styles.planOption}>
                      <p className={styles.planDuration}>{plan.duration}</p><p className={styles.planDetail}>{plan.duration === "1 month" ? "A short commitment to get started." : plan.duration === "3 months" ? "A full term of consistent learning." : "A longer learning routine with fewer renewals."}</p>
                      <p className={styles.planPrice}>₹{amount.toLocaleString("en-IN")}</p>
                      <p className={styles.planDetail}>{plan.days} live class days each week. Price covers the full {plan.duration}.</p>
                      {offerActive && plan.offer < plan.regular && <p className="mt-0.5 text-[8px] font-bold text-blue-700">Save ₹{(plan.regular - plan.offer).toLocaleString("en-IN")}</p>}
                      <Link href={`/billing?bookingId=${encodeURIComponent(bookingId)}&plan=${plan.id}&offerEndsAt=${expiresAt}`} className="mt-2 flex w-full items-center justify-center rounded-lg bg-slate-950 px-2 py-2 text-[9px] font-semibold text-white transition hover:bg-indigo-600">Choose</Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-[9px] leading-4 text-slate-400">{offerActive ? "Your multi-month savings are available for 3 days after your final demo class." : "Choose a plan to continue learning with BlankLearn."} Checkout confirms your final amount securely.</p>
      </div>
    </div>
  );
}

function formatSubjects(subjects?: string[]) {
  if (!subjects || subjects.length === 0) {
    return "Live Demo";
  }

  return subjects
    .map((item) => {
      if (item === "MATH") return "Math";
      if (item === "SCIENCE") return "Science";
      if (item === "ENGLISH") return "English";

      return item;
    })
    .join(" + ");
}

function canStudentJoin(
  status?: SessionStatus
) {
  return (
    status === "SCHEDULED" ||
    status === "PREPARING" ||
    status === "OPEN_FOR_JOIN" ||
    status === "LIVE"
  );
}

function isLive(status?: SessionStatus) {
  return (
    status === "OPEN_FOR_JOIN" ||
    status === "LIVE"
  );
}

function statusLabel(status?: SessionStatus) {
  switch (status) {
    case "LIVE":
      return "LIVE NOW";

    case "OPEN_FOR_JOIN":
      return "READY TO JOIN";

    case "PREPARING":
      return "STARTING SOON";

    case "SCHEDULED":
      return "SCHEDULED";

    case "ENDED":
    case "COMPLETED":
      return "COMPLETED";

    case "CANCELLED":
      return "CANCELLED";

    default:
      return "WAITING";
  }
}

function statusClass(status?: SessionStatus) {
  switch (status) {
    case "LIVE":
      return "bg-red-50 text-red-600 border-red-100";

    case "OPEN_FOR_JOIN":
      return "bg-blue-50 text-blue-700 border-blue-100";

    case "PREPARING":
      return "bg-amber-50 text-amber-700 border-amber-100";

    case "SCHEDULED":
      return "bg-slate-50 text-slate-600 border-slate-200";

    default:
      return "bg-slate-50 text-slate-500 border-slate-200";
  }
}

/* ========================================================================== */
/* EMPTY STATE                                                                */
/* ========================================================================== */

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
      <div>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm">
          <CalendarDays size={22} />
        </div>

        <h3 className="text-base font-semibold text-slate-900">
          {title}
        </h3>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* PAGE                                                                       */
/* ========================================================================== */

export default function StudentHubPage() {
  const router = useRouter();
  const platform = usePlatformSettings();
  const [clock, setClock] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 1000); return () => window.clearInterval(timer); }, []);

  const [student, setStudent] =
    useState<Student | null>(null);

  const [demos, setDemos] =
    useState<DemoBooking[]>([]);

  const [sessions, setSessions] =
    useState<Session[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [demoDetails, setDemoDetails] = useState<Record<string, {teacherName: string; sessions: Session[]}>>({});
  const [detailsError, setDetailsError] = useState(false);
  const bookingKey = demos.map((demo) => demo.id).join(",");
  useEffect(() => {
    if (!bookingKey) return;
    let active = true;
    const controller = new AbortController();
    const load = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const response = await fetch("/api/student-demo-details", { headers: { Authorization: "Bearer " + token }, cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Details unavailable");
        const data = await response.json() as {details: Array<{id: string; teacherName: string; sessions: Session[]}>};
        if (active) { setDemoDetails(Object.fromEntries(data.details.map((detail) => [detail.id, detail]))); setDetailsError(false); }
      } catch { if (active) setDetailsError(true); }
    };
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => { active = false; controller.abort(); window.clearInterval(timer); };
  }, [bookingKey]);

  const [refreshing, setRefreshing] =
    useState(false);

  /* ---------------------------------------------------------------------- */
  /* AUTH + DATA                                                            */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    let unsubscribeSessions:
      | (() => void)
      | null = null;

    let unsubscribeDemos:
      | (() => void)
      | null = null;

    const unsubscribeAuth =
      onAuthStateChanged(
        auth,
        async (user) => {
          if (!user) {
            router.replace("/student-auth");
            return;
          }

          try {
            setLoading(true);
            setError("");

            /* ------------------------------------------------------------ */
            /* STUDENT PROFILE                                               */
            /* ------------------------------------------------------------ */

            const studentRef = doc(
              db,
              "students",
              user.uid
            );

            const studentSnap =
              await getDoc(studentRef);

            if (studentSnap.exists()) {
              setStudent({
                ...(studentSnap.data() as Student),
                uid: user.uid,
              });
            } else {
              setStudent({
                uid: user.uid,
                name:
                  user.displayName ||
                  user.email?.split("@")[0] ||
                  "Student",
                email: user.email || "",
              });
            }

            /* ------------------------------------------------------------ */
            /* STUDENT DEMOS                                                 */
            /* ------------------------------------------------------------ */

            const demoQuery = query(
              collection(db, "demo_bookings"),
              where(
                "studentId",
                "==",
                user.uid
              )
            );

            unsubscribeDemos =
              onSnapshot(
                demoQuery,
                (snapshot) => {
                  const items =
                    snapshot.docs.map(
                      (item) => ({
                        ...(item.data() as DemoBooking),
                        id: item.id,
                      })
                    );

                  items.sort(
                    (a, b) =>
                      getDateTime(
                        a.date,
                        a.startTime
                      ) -
                      getDateTime(
                        b.date,
                        b.startTime
                      )
                  );

                  setDemos(items);
                },
                (snapshotError) => {
                  console.error(
                    "Student demos listener:",
                    snapshotError
                  );

                  setError(
                    "Unable to load your demos."
                  );
                }
              );

            /* ------------------------------------------------------------ */
            /* NORMAL LIVE CLASSES                                           */
            /* ------------------------------------------------------------ */

            const sessionQuery = query(
              collection(db, "class_sessions"),
              where(
                "studentIds",
                "array-contains",
                user.uid
              )
            );

            unsubscribeSessions =
              onSnapshot(
                sessionQuery,
                (snapshot) => {
                  const items =
                    snapshot.docs.map(
                      (item) => ({
                        ...(item.data() as Session),
                        id: item.id,
                      })
                    );

                  items.sort(
                    (a, b) =>
                      getDateTime(
                        a.date,
                        a.startTime
                      ) -
                      getDateTime(
                        b.date,
                        b.startTime
                      )
                  );

                  setSessions(items);
                },
                (snapshotError) => {
                  console.error(
                    "Student sessions listener:",
                    snapshotError
                  );
                }
              );

            /* ------------------------------------------------------------ */
            /* IMPORTANT: DEMO SESSION LOOKUP                                */
            /* ------------------------------------------------------------ */
            /*
             * A demo booking and a LiveKit class session
             * are two different Firestore documents.
             *
             * We also look for class_sessions using
             * the demo's batchId.
             *
             * This is what makes:
             *
             * demo_bookings
             *      ↓
             * class_sessions
             *      ↓
             * /classroom/{sessionId}
             *
             * work for the student.
             */

            const demoSnapshot =
              await getDocs(demoQuery);

            const demoItems =
              demoSnapshot.docs.map(
                (item) => ({
                  ...(item.data() as DemoBooking),
                  id: item.id,
                })
              );

            const additionalSessions: Session[] =
              [];

            for (const demo of demoItems) {
              const possibleIds = [
                demo.sessionId,
                demo.batchId,
                demo.demoBatchId,
              ].filter(
                Boolean
              ) as string[];

              /* ---------------------------------------------------------- */
              /* Direct session document ID                                  */
              /* ---------------------------------------------------------- */

              if (demo.sessionId) {
                try {
                  const directSessionSnap =
                    await getDoc(
                      doc(
                        db,
                        "class_sessions",
                        demo.sessionId
                      )
                    );

                  if (
                    directSessionSnap.exists()
                  ) {
                    additionalSessions.push({
                      ...(directSessionSnap.data() as Session),
                      id:
                        directSessionSnap.id,
                    });
                  }
                } catch (sessionError) {
                  console.error(
                    "Direct demo session lookup:",
                    sessionError
                  );
                }
              }

              /* ---------------------------------------------------------- */
              /* batchId / demoBatchId lookup                                */
              /* ---------------------------------------------------------- */

              for (
                const lookupId of possibleIds
              ) {
                try {
                  const batchQuery =
                    query(
                      collection(
                        db,
                        "class_sessions"
                      ),
                      where(
                        "batchId",
                        "==",
                        lookupId
                      )
                    );

                  const batchSnap =
                    await getDocs(
                      batchQuery
                    );

                  batchSnap.docs.forEach(
                    (item) => {
                      additionalSessions.push({
                        ...(item.data() as Session),
                        id: item.id,
                      });
                    }
                  );
                } catch (sessionError) {
                  console.error(
                    "Demo batch session lookup:",
                    sessionError
                  );
                }

                try {
                  const demoBatchQuery =
                    query(
                      collection(
                        db,
                        "class_sessions"
                      ),
                      where(
                        "demoBatchId",
                        "==",
                        lookupId
                      )
                    );

                  const demoBatchSnap =
                    await getDocs(
                      demoBatchQuery
                    );

                  demoBatchSnap.docs.forEach(
                    (item) => {
                      additionalSessions.push({
                        ...(item.data() as Session),
                        id: item.id,
                      });
                    }
                  );
                } catch (sessionError) {
                  console.error(
                    "DemoBatch session lookup:",
                    sessionError
                  );
                }
              }
            }

            /* ------------------------------------------------------------ */
            /* MERGE WITHOUT DUPLICATES                                      */
            /* ------------------------------------------------------------ */

            if (
              additionalSessions.length > 0
            ) {
              setSessions((current) => {
                const map =
                  new Map<
                    string,
                    Session
                  >();

                current.forEach(
                  (item) =>
                    map.set(
                      item.id,
                      item
                    )
                );

                additionalSessions.forEach(
                  (item) =>
                    map.set(
                      item.id,
                      item
                    )
                );

                return Array.from(
                  map.values()
                ).sort(
                  (a, b) =>
                    getDateTime(
                      a.date,
                      a.startTime
                    ) -
                    getDateTime(
                      b.date,
                      b.startTime
                    )
                );
              });
            }

            setLoading(false);
          } catch (err) {
            console.error(
              "Student dashboard error:",
              err
            );

            setError(
              "Unable to load your dashboard."
            );

            setLoading(false);
          }
        }
      );

    return () => {
      unsubscribeAuth();

      if (unsubscribeSessions) {
        unsubscribeSessions();
      }

      if (unsubscribeDemos) {
        unsubscribeDemos();
      }
    };
  }, [router]);

  /* ====================================================================== */
  /* REFRESH                                                                 */
  /* ====================================================================== */

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      const user = auth.currentUser;

      if (!user) {
        router.replace(
          "/student-auth"
        );
        return;
      }

      window.location.reload();
    } finally {
      setRefreshing(false);
    }
  };

  /* ====================================================================== */
  /* DEMO + SESSION LINKING                                                  */
  /* ====================================================================== */

  const getDemoSession = (
    demo: DemoBooking
  ) => {
    const linkedIds = demo.sessionIds || demo.demoSessionIds;
    if (linkedIds?.length) {
      const linked = linkedIds.map((id) => sessions.find((session) => session.id === id)).filter((session): session is Session => Boolean(session));
      const next = linked.slice().sort((a,b) => getDateTime(a.date,a.startTime)-getDateTime(b.date,b.startTime)).find((session) => !["ENDED", "COMPLETED", "CANCELLED"].includes(String(session.status)) && (!Number.isFinite(studentAccess(session, clock).endsAt) || studentAccess(session, clock).endsAt > clock));
      return next || linked.sort((a, b) => Number(b.demoSessionIndex || 0) - Number(a.demoSessionIndex || 0))[0];
    }
    return sessions.find(
      (session) =>
        (
          demo.sessionId &&
          session.id ===
            demo.sessionId
        ) ||
        (
          demo.batchId &&
          session.batchId ===
            demo.batchId
        ) ||
        (
          demo.batchId &&
          session.demoBatchId ===
            demo.batchId
        ) ||
        (
          demo.demoBatchId &&
          session.batchId ===
            demo.demoBatchId
        ) ||
        (
          demo.demoBatchId &&
          session.demoBatchId ===
            demo.demoBatchId
        )
    );
  };

  /* ====================================================================== */
  /* COMPUTED DATA                                                           */
  /* ====================================================================== */

  const upcomingDemos = useMemo(() => demos.filter((demo) => demo.status !== "CANCELLED"), [demos]);

  const upcomingClasses = useMemo(() => {
    return sessions.filter(
      (session) =>
        session.status !==
          "ENDED" &&
        session.status !==
          "COMPLETED" &&
        session.status !==
          "CANCELLED"
    );
  }, [sessions]);

  const liveClasses = useMemo(() => {
    return sessions.filter(
      (session) =>
        isLive(session.status)
    );
  }, [sessions]);

  const nextClass = useMemo(() => {
    return upcomingClasses
      .slice()
      .sort(
        (a, b) =>
          getDateTime(
            a.date,
            a.startTime
          ) -
          getDateTime(
            b.date,
            b.startTime
          )
      )[0];
  }, [upcomingClasses]);

  const classNumber =
    student?.classNumber;

  const board =
    student?.board || "CBSE";

  const studentName =
    student?.name || "Student";

  const completedDemoForOffer = upcomingDemos.find((demo) => demo.membershipStatus !== "ACTIVE" && demoIsComplete(demo, sessions));
  const completedDemoSessions = completedDemoForOffer
    ? (completedDemoForOffer.sessionIds || completedDemoForOffer.demoSessionIds || []).map((id) => sessions.find((session) => session.id === id)).filter((session): session is Session => Boolean(session))
    : [];
  const completedDemoFallbackSession = completedDemoForOffer ? getDemoSession(completedDemoForOffer) : undefined;

  /* ====================================================================== */
  /* LOADING                                                                 */
  /* ====================================================================== */

  if (loading) {
    return (
      <div className={styles.hub}>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-blue-100 border-t-indigo-600" />

            <p className="text-sm font-semibold text-slate-600">
              Loading your classroom...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ====================================================================== */
  /* UI                                                                       */
  /* ====================================================================== */

  const demoIds = new Set(demos.flatMap((demo) => [...(demo.sessionIds || demo.demoSessionIds || []), ...(demo.sessionId ? [demo.sessionId] : [])]));
  const regularClasses = upcomingClasses.filter((session) => !demoIds.has(session.id) && session.type !== "DEMO" && !session.isDemo);
  const purchased = demos.filter((demo) => demo.membershipStatus === "ACTIVE");
  const joinControl = (session: Session) => {
    const access = studentAccess(session, clock);
    return <div className={styles.joinArea}>{access.allowed ? <Link href={"/classroom/" + encodeURIComponent(session.id)} className={styles.primaryAction}><Video size={17}/>Join class<ArrowRight size={16}/></Link> : <><button type="button" disabled className={styles.disabledJoin}><Video size={17}/>Join class</button><p>{access.reason}</p></>}</div>;
  };

  return <div className={styles.cleanDashboard}>
    <header className={styles.welcomeBanner}>
      <div className={styles.welcomeCopy}><span className={styles.welcomeLabel}><span/>Your learning space</span><h1>Welcome back,<br/><span>{studentName.split(" ")[0]}.</span></h1><p>A new class. A new idea. A little more confidence.<br/>Your next learning moment is right here.</p><button type="button" onClick={handleRefresh} disabled={refreshing} className={styles.refresh}><RefreshCw size={15} className={refreshing ? "animate-spin" : ""}/>{refreshing ? "Refreshing..." : "Refresh schedule"}</button></div>
      <div className={styles.welcomeImage}><Image src="/img2.png" alt="A student raising his hand during an online lesson with his teacher" fill priority sizes="(max-width: 600px) 100vw, 45vw"/><div className={styles.imageCaption}><Video size={17}/><span>Real teachers. Personal learning.</span></div></div>
    </header>
    {error && <div role="alert" className={styles.error}>{error}</div>}
    <div className={styles.dashboardColumns}>
      <div className={styles.bookingColumn}>
        <section aria-labelledby="booked-demos"><div className={styles.cleanSectionTitle}><h2 id="booked-demos">Your booked demos</h2><span>{upcomingDemos.length} booked</span></div>
          {upcomingDemos.length === 0 ? <div className={styles.noBooking}><span className={styles.bookingIcon}><CalendarDays size={27}/></span><h3>Book your first demo</h3><p>Choose your subjects, meet your teacher and try three live sessions before choosing a plan.</p><Link href="/demo-booking" className={styles.primaryAction}>Book a demo<ArrowRight size={17}/></Link></div> : <div className={styles.bookingStack}>{upcomingDemos.map((demo) => {
            const detail = demoDetails[demo.id];
            const resolved = Array.from(new Map([...sessions, ...(detail?.sessions || [])].map((session) => [session.id, session])).values());
            const ids = [...new Set([...(demo.sessionIds || demo.demoSessionIds || []), ...(demo.sessionId ? [demo.sessionId] : []), ...(detail?.sessions.map((session) => session.id) || [])])].sort((a,b) => getDateTime(resolved.find((session) => session.id === a)?.date, resolved.find((session) => session.id === a)?.startTime)-getDateTime(resolved.find((session) => session.id === b)?.date, resolved.find((session) => session.id === b)?.startTime));
            const complete = demoIsComplete({...demo, sessionIds: ids}, resolved);
            const current = ids.map((id) => resolved.find((session) => session.id === id)).find((session) => session && !["ENDED","COMPLETED","CANCELLED"].includes(String(session.status))) || getDemoSession(demo);
            const finished = ids.filter((id) => ["ENDED","COMPLETED"].includes(String(resolved.find((session) => session.id === id)?.status))).length;
            return <article key={demo.id} className={styles.bookingCard}>
              <div className={styles.bookingTop}><span className={styles.bookingTag}>{complete ? "Demo completed" : "Booked demo"}</span><span className={styles.bookingReference}>#{demo.id.slice(-7).toUpperCase()}</span></div>
              <h3>{formatSubjects(demo.subjects)}</h3><p className={styles.bookingSubtitle}>{demo.classNumber ? "Class " + demo.classNumber + " / " : ""}{demo.board || board}{demo.demoType ? " / " + (demo.demoType === "GROUP" ? "Small group" : "One-to-one") : ""}</p>
              <div className={styles.teacherRow}><span className={styles.teacherAvatar}><UserRound size={19}/></span><div><small>Your teacher</small><strong>{detail?.teacherName || demo.teacherName || current?.teacherName || (detailsError ? "Teacher details could not load. Refresh to retry." : detail ? "Teacher assignment pending" : "Loading teacher details...")}</strong></div></div>
              <div className={styles.bookingFacts}><div><small>Student</small><strong>{demo.studentName || studentName}</strong></div><div><small>Booking status</small><strong>{demo.status || "Confirmed"}</strong></div><div><small>Demo fee</small><strong>{typeof demo.finalPrice === "number" ? demo.finalPrice === 0 ? "Free" : new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(demo.finalPrice) : "Not recorded"}</strong></div><div><small>Session progress</small><strong>{finished} of {Math.max(ids.length, demo.demoSessionCount || 1)} completed</strong></div></div><div className={styles.scheduleHeading}><h4>Session schedule</h4><span>All times in India Standard Time</span></div><div className={styles.sessionSchedule}>{Array.from({length: Math.max(ids.length, demo.demoSessionCount || 1)}, (_,index) => { const day = resolved.find((session) => session.id === ids[index]); const done = day && ["ENDED","COMPLETED"].includes(String(day.status)); return <div key={ids[index] || index} className={styles.scheduleRow}><span className={styles.dayNumber}>{String(index+1).padStart(2,"0")}</span><div><strong>Day {index+1}</strong><p>{formatDate(day?.date || (index === 0 ? demo.date : undefined))}</p></div><div className={styles.scheduleTime}><strong>{day?.startTime || (index === 0 ? demo.startTime : "") || "Pending"}{day?.endTime ? " - " + day.endTime : ""}</strong><small>{done ? "Completed" : day?.status === "CANCELLED" ? "Cancelled" : "IST"}</small></div></div>; })}</div>
              {Number(demo.finalPrice) > 0 && demo.paymentStatus !== "PAID" ? <DemoPayment bookingId={demo.id} amount={Number(demo.finalPrice)}/> : complete ? <div className={styles.completeNote}><CheckCircle2 size={17}/>Your booked demo sessions are complete.{demo.membershipStatus !== "ACTIVE" && <a href="#learning-plans">View plans <ArrowRight size={14}/></a>}</div> : current ? joinControl(current) : <div className={styles.joinArea}><button disabled className={styles.disabledJoin}><Video size={17}/>Join demo</button><p>Your classroom is being prepared. Join will open at your scheduled time.</p></div>}
            </article>;
          })}</div>}
        </section>
        {(purchased.length > 0 || regularClasses.length > 0) && <section aria-labelledby="purchased-classes"><div className={styles.cleanSectionTitle}><h2 id="purchased-classes">Your purchased classes</h2></div><div className={styles.bookingStack}>
          {purchased.map((booking) => <article key={booking.id} className={styles.purchaseSummary}><span className={styles.bookingTag}>Active membership</span><h3>{formatSubjects(booking.subjects)}</h3><p>{booking.teacherName || "Your assigned teacher"}{booking.classNumber ? " / Class " + booking.classNumber : ""}</p>{!regularClasses.some((session) => session.batchId === booking.batchId) && <p className={styles.pendingSchedule}>Your class schedule is being prepared. Session dates and join buttons will appear here.</p>}</article>)}
          {regularClasses.map((session) => <article key={session.id} className={styles.bookingCard}><div className={styles.bookingTop}><span className={styles.bookingTag}>Scheduled class</span><span className={styles.bookingReference}>{statusLabel(session.status)}</span></div><h3>{session.title || session.subject || "Live class"}</h3><p className={styles.bookingSubtitle}>{session.teacherName || "Your assigned teacher"}{session.classNumber ? " / Class " + session.classNumber : ""}</p><div className={styles.classDate}><span><CalendarDays size={17}/>{formatDate(session.date)}</span><span><Clock3 size={17}/>{session.startTime || "Time pending"}{session.endTime ? " - " + session.endTime : ""} IST</span></div>{joinControl(session)}</article>)}
        </div></section>}
        {upcomingDemos.length > 0 && <Link href="/demo-booking" className={styles.anotherDemo}><span><strong>Want to try another subject?</strong><small>Book another demo at a time that suits you.</small></span><span>Book a demo <ArrowRight size={17}/></span></Link>}
      </div>
      <section id="learning-plans" className={styles.centeredPricing}><div className={styles.cleanSectionTitle}><h2>Learning plans</h2></div><p className={styles.pricingIntro}>{completedDemoForOffer ? "Your demo is complete. Choose how you want to continue." : "Preview the plans. Complete your demo before choosing a membership."}</p>
        {completedDemoForOffer ? <DemoPurchaseOffer bookingId={completedDemoForOffer.id} endedAt={completedDemoForOffer.demoCompletedAt || completedDemoSessions.at(-1)?.endedAt || completedDemoFallbackSession?.endedAt} /> : <div className={styles.pricePreview}><PlanExplanation/>{[3,6].map(days => ({days,prices:Object.values(platform.plans).filter(p => p.classesPerWeek === days).sort((a,b)=>a.months-b.months).map(p=>p.regular)})).map(({days,prices}) => <div key={days}><h3>{days} days <span>/ week</span></h3>{prices.map((price,index) => <div className={styles.priceRow} key={price}><span>{[1,3,6][index]} {[1,3,6][index] === 1 ? "month" : "months"}</span><strong>{new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(price)}</strong></div>)}</div>)}<p>Prices cover the full selected term, not a monthly installment. Eligible savings on 3- and 6-month plans appear after your final demo session.</p>{!upcomingDemos.length && <Link href="/demo-booking" className={styles.primaryAction}>Start with a demo<ArrowRight size={16}/></Link>}</div>}
      </section>
    </div>
  </div>;
}

function PlanExplanation() {
  return <div className={styles.planExplanation}><div><h3>Choose your weekly pace</h3><p><strong>3 days a week:</strong> a lighter schedule with days between lessons for independent practice.</p><p><strong>6 days a week:</strong> more frequent lessons for a near-daily learning routine.</p></div><div><h3>Choose how long to continue</h3><p><strong>1 month:</strong> the shortest commitment. <strong>3 months:</strong> a longer term. <strong>6 months:</strong> the longest term with fewer renewals.</p><p>Plans differ by weekly frequency and duration. Eligible multi-month demo offers reduce the total price; they do not add extra features.</p></div></div>;
}
