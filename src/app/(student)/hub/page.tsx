"use client";

import { readApiResponse } from "@/lib/api-response";



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


  GraduationCap,
  ChevronRight,
  BookMarked,
  Radio,
  ShieldCheck,} from "lucide-react";



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
  enrollmentStatus?: string;
  subscriptionStatus?: string;
  activeBatchId?: string;

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

        const data = await readApiResponse(response) as {details: Array<{id: string; teacherName: string; sessions: Session[]}>};

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

    let unsubscribeStudent: (() => void) | undefined;
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



            unsubscribeStudent?.();
            unsubscribeStudent = onSnapshot(studentRef, snapshot => { if (snapshot.exists()) setStudent({ ...snapshot.data(), uid: user.uid } as Student); });
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
      unsubscribeStudent?.();



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

      const next = linked.slice().sort((a,b) => getDateTime(a.date,a.startTime)-getDateTime(b.date,b.startTime)).find((session) => !["ENDED", "COMPLETED", "CANCELLED"].includes(String(session.status)));

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
      <main className="min-h-screen bg-[#f6f8fc]">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="rounded-[28px] border border-slate-200 bg-white px-10 py-9 text-center shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-100 border-t-indigo-600" />
            </div>
            <p className="mt-4 text-sm font-black text-slate-800">Preparing your learning space</p>
            <p className="mt-1 text-xs text-slate-400">Loading classes, demos and your schedule...</p>
          </div>
        </div>
      </main>
    );
  }

  const demoIds = new Set(
    demos.flatMap((demo) => [
      ...(demo.sessionIds || demo.demoSessionIds || []),
      ...(demo.sessionId ? [demo.sessionId] : []),
    ]),
  );

  const regularClasses = upcomingClasses.filter(
    (session) => !demoIds.has(session.id) && session.type !== "DEMO" && !session.isDemo,
  );

  const isRegular = student?.enrollmentStatus === "REGULAR" || demos.some(demo => demo.membershipStatus === "ACTIVE");
  const purchased = demos.filter((demo) => demo.membershipStatus === "ACTIVE");
  const activeDemos = isRegular ? [] : upcomingDemos.filter((demo) => demo.membershipStatus !== "ACTIVE");
  const firstName = studentName.split(" ")[0];
  const studentInitial = studentName.trim().charAt(0).toUpperCase();

  const joinControl = (session: Session, compact = false) => {
    const access = studentAccess(session, clock);

    const allocatedDemo = demos.some(demo => demo.batchId === session.batchId && demo.membershipStatus !== "ACTIVE" && !demoIsComplete(demo, sessions) && demo.status !== "CANCELLED" && ["PAID", "NOT_REQUIRED"].includes(demo.paymentStatus || "") && [demo.sessionId, ...(demo.sessionIds || [])].includes(session.id));
    const regularAccess = isRegular && student?.subscriptionStatus !== "EXPIRED" && student?.subscriptionStatus !== "CANCELLED" && (session.batchId === student?.activeBatchId || purchased.some(demo => demo.batchId === session.batchId));
    if (access.allowed && (allocatedDemo || regularAccess)) {
      return (
        <Link
          href={"/classroom/" + encodeURIComponent(session.id)}
          className={`inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 font-black text-white shadow-lg shadow-indigo-100 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl ${
            compact ? "rounded-xl px-4 py-2.5 text-[10px]" : "w-full rounded-2xl px-5 py-3.5 text-xs"
          }`}
        >
          <Video size={compact ? 13 : 15} />
          Join class
          <ChevronRight size={compact ? 13 : 15} />
        </Link>
      );
    }

    return (
      <div className={compact ? "" : "w-full"}>
        <button
          type="button"
          disabled
          className={`inline-flex items-center justify-center gap-2 bg-slate-100 font-black text-slate-400 ${
            compact ? "rounded-xl px-4 py-2.5 text-[10px]" : "w-full rounded-2xl px-5 py-3.5 text-xs"
          }`}
        >
          <Video size={compact ? 13 : 15} />
          Join class
        </button>
        {!compact && (
          <p className="mt-2 text-center text-[10px] font-semibold leading-4 text-slate-400">
            {access.reason}
          </p>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#f6f8fc] text-slate-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-36 -top-32 h-[430px] w-[430px] rounded-full bg-indigo-100/55 blur-3xl" />
        <div className="absolute -right-40 top-[300px] h-[500px] w-[500px] rounded-full bg-sky-100/55 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-[1500px] px-4 py-4 sm:px-6 lg:px-8 lg:py-7">
        {/* NAVIGATION */}
        <nav className="mb-5 flex items-center justify-between rounded-[22px] border border-white/80 bg-white/85 px-4 py-3 shadow-[0_8px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[13px] bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-200">
              <GraduationCap size={21} />
            </div>
            <div>
              <p className="text-[15px] font-black tracking-tight text-slate-950">BlankLearn</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Student Space</p>
            </div>
          </div>

          <div className="hidden items-center gap-1 rounded-xl bg-slate-50 p-1 md:flex">
            <span className="rounded-lg bg-white px-4 py-2 text-xs font-black text-indigo-700 shadow-sm">Home</span>
            <a href="#booked-demos" className="px-4 py-2 text-xs font-bold text-slate-400 transition hover:text-slate-700">Demos</a>
            <a href="#classes" className="px-4 py-2 text-xs font-bold text-slate-400 transition hover:text-slate-700">Classes</a>
            <a href="#learning-plans" className="px-4 py-2 text-xs font-bold text-slate-400 transition hover:text-slate-700">Plans</a>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh schedule"
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            </button>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-3">
              {student?.photoURL ? (
                <Image
                  src={student.photoURL}
                  alt={studentName}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-lg object-cover"
                />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-xs font-black text-white">
                  {studentInitial}
                </span>
              )}
              <div className="hidden sm:block">
                <p className="max-w-[120px] truncate text-[11px] font-black text-slate-800">{studentName}</p>
                <p className="text-[9px] font-semibold text-slate-400">
                  {classNumber ? `Class ${classNumber}` : "Student"} · {board}
                </p>
              </div>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <header className="relative isolate overflow-hidden rounded-[30px] border border-indigo-100/60 bg-[#101a3a] shadow-[0_22px_70px_rgba(30,41,90,0.16)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(99,102,241,0.38),transparent_40%),radial-gradient(circle_at_72%_120%,rgba(14,165,233,0.28),transparent_38%)]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] lg:block">
            <Image
              src="/img2.png"
              alt="Student learning in a live online class"
              fill
              priority
              sizes="46vw"
              className="object-cover object-center opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#101a3a] via-[#101a3a]/65 to-[#101a3a]/5" />
          </div>

          <div className="relative z-10 min-h-[300px] p-6 sm:p-8 lg:flex lg:items-center lg:p-10">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-indigo-100 backdrop-blur">
                <Sparkles size={13} /> Your learning space
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] text-white sm:text-[44px] sm:leading-[1.04]">
                Welcome back,<br />
                <span className="text-indigo-200">{firstName}.</span>
                <span className="mt-3 block text-xs font-bold">{isRegular ? "REGULAR STUDENT" : activeDemos.length ? "DEMO STUDENT" : "NEW STUDENT"}</span>
              </h1>

              <p className="mt-3 max-w-lg text-sm leading-6 text-slate-300">
                Your demos, live classes and learning plan are organized here so you always know what&apos;s next.
              </p>

              <div className="mt-6 flex flex-wrap gap-2.5">
                {liveClasses[0] ? (
                  joinControl(liveClasses[0], true)
                ) : nextClass ? (
                  <div className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-black text-white backdrop-blur">
                    <Clock3 size={14} />
                    Next: {formatDate(nextClass.date)} · {nextClass.startTime || "Time pending"}
                  </div>
                ) : (
                  <Link
                    href="/demo-booking"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-black text-[#111b3b] shadow-lg transition hover:-translate-y-0.5"
                  >
                    <BookOpen size={14} /> Book a demo
                  </Link>
                )}
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 shadow-sm">
            {error}
          </div>
        )}

        {/* STATS */}
        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "Booked demos",
              value: activeDemos.length,
              hint: "Demo programs",
              icon: <BookMarked size={17} />,
            },
            {
              label: "Live now",
              value: liveClasses.length,
              hint: "Ready classrooms",
              icon: <Radio size={17} />,
            },
            {
              label: "Upcoming",
              value: regularClasses.length,
              hint: "Scheduled classes",
              icon: <CalendarDays size={17} />,
            },
            {
              label: "Membership",
              value: purchased.length ? "Active" : "Demo",
              hint: purchased.length ? "Learning plan active" : "Explore before joining",
              icon: <Award size={17} />,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="group rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_7px_25px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-md sm:p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.11em] text-slate-400">{item.label}</p>
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-indigo-600">{item.icon}</span>
              </div>
              <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">{item.value}</p>
              <p className="mt-1 text-[10px] font-semibold text-slate-400">{item.hint}</p>
            </div>
          ))}
        </section>

        <div className="mt-9 grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,.55fr)]">
          <div className="space-y-10">
            {/* BOOKED DEMOS */}
            <section id="booked-demos" aria-labelledby="booked-demo-heading">
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 id="booked-demo-heading" className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                      Your booked demos
                    </h2>
                    {activeDemos.length > 0 && (
                      <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-black text-indigo-700">
                        {activeDemos.length}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Meet your teacher, follow each demo day and join the classroom from here.
                  </p>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-700">
                  <ShieldCheck size={14} /> Secure live classroom
                </span>
              </div>

              {activeDemos.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <CalendarDays size={24} />
                  </span>
                  <h3 className="mt-4 text-base font-black text-slate-900">Book your first demo</h3>
                  <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">
                    Choose your subjects, meet your teacher and try live sessions before selecting a learning plan.
                  </p>
                  <Link
                    href="/demo-booking"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-black text-white transition hover:bg-indigo-700"
                  >
                    Book a demo <ArrowRight size={14} />
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeDemos.map((demo) => {
                    const detail = demoDetails[demo.id];

                    const resolved = Array.from(
                      new Map(
                        [...sessions, ...(detail?.sessions || [])].map((session) => [session.id, session]),
                      ).values(),
                    );

                    const ids = [
                      ...new Set([
                        ...(demo.sessionIds || demo.demoSessionIds || []),
                        ...(demo.sessionId ? [demo.sessionId] : []),
                        ...(detail?.sessions.map((session) => session.id) || []),
                      ]),
                    ].sort(
                      (a, b) =>
                        getDateTime(
                          resolved.find((session) => session.id === a)?.date,
                          resolved.find((session) => session.id === a)?.startTime,
                        ) -
                        getDateTime(
                          resolved.find((session) => session.id === b)?.date,
                          resolved.find((session) => session.id === b)?.startTime,
                        ),
                    );

                    const complete = demoIsComplete({ ...demo, sessionIds: ids }, resolved);

                    const current =
                      ids
                        .map((id) => resolved.find((session) => session.id === id))
                        .find((session) => session && studentAccess(session, clock).allowed) ||
                      ids
                        .map((id) => resolved.find((session) => session.id === id))
                        .find(
                          (session) =>
                            session &&
                            !["ENDED", "COMPLETED", "CANCELLED"].includes(String(session.status)),
                        ) ||
                      getDemoSession(demo);

                    const finished = ids.filter((id) =>
                      ["ENDED", "COMPLETED"].includes(
                        String(resolved.find((session) => session.id === id)?.status),
                      ),
                    ).length;

                    const total = Math.max(ids.length, demo.demoSessionCount || 1);
                    const progress = Math.min(100, Math.round((finished / total) * 100));
                    const access = current ? studentAccess(current, clock) : null;
                    const clickable = Boolean(current && access?.allowed);

                    const openDemo = () => {
                      if (current && studentAccess(current, clock).allowed) {
                        router.push("/classroom/" + encodeURIComponent(current.id));
                      }
                    };

                    return (
                      <article
                        key={demo.id}
                        onClick={clickable ? openDemo : undefined}
                        className={`group relative overflow-hidden rounded-[28px] border bg-white shadow-[0_10px_35px_rgba(15,23,42,0.055)] transition duration-300 ${
                          clickable
                            ? "cursor-pointer border-indigo-100 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_20px_55px_rgba(79,70,229,0.12)]"
                            : "border-slate-200"
                        }`}
                      >
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-400" />

                        <div className="p-5 sm:p-6">
                          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                            <div className="flex items-start gap-3">
                              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                                <Video size={21} />
                              </span>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.11em] ${
                                    complete ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700"
                                  }`}>
                                    {complete ? "Demo completed" : "Booked demo"}
                                  </span>
                                  {current?.status === "LIVE" && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[9px] font-black text-rose-600">
                                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
                                      LIVE NOW
                                    </span>
                                  )}
                                </div>
                                <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">
                                  {formatSubjects(demo.subjects)}
                                </h3>
                                <p className="mt-1 text-[11px] font-semibold text-slate-400">
                                  {demo.classNumber ? `Class ${demo.classNumber} · ` : ""}
                                  {demo.board || board}
                                  {demo.demoType
                                    ? ` · ${demo.demoType === "GROUP" ? "Small group" : "One-to-one"}`
                                    : ""}
                                </p>
                              </div>
                            </div>
                            <span className="text-[9px] font-bold text-slate-300">
                              #{demo.id.slice(-7).toUpperCase()}
                            </span>
                          </div>

                          <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3.5 sm:col-span-1">
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm">
                                <UserRound size={18} />
                              </span>
                              <div className="min-w-0">
                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Your teacher</p>
                                <p className="mt-1 truncate text-xs font-black text-slate-800">
                                  {detail?.teacherName ||
                                    demo.teacherName ||
                                    current?.teacherName ||
                                    (detailsError
                                      ? "Details unavailable"
                                      : detail
                                        ? "Assignment pending"
                                        : "Loading...")}
                                </p>
                              </div>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-3.5">
                              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Demo fee</p>
                              <p className="mt-2 text-xs font-black text-slate-800">
                                {typeof demo.finalPrice === "number"
                                  ? demo.finalPrice === 0
                                    ? "Free"
                                    : new Intl.NumberFormat("en-IN", {
                                        style: "currency",
                                        currency: "INR",
                                        maximumFractionDigits: 0,
                                      }).format(demo.finalPrice)
                                  : "Not recorded"}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-3.5">
                              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Booking</p>
                              <p className="mt-2 text-xs font-black text-slate-800">{demo.status || "Confirmed"}</p>
                            </div>
                          </div>

                          <div className="mt-5">
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Demo progress</p>
                              <p className="text-[10px] font-black text-slate-600">{finished} of {total} completed</p>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>

                          <div className="mt-5">
                            <div className="mb-3 flex items-center justify-between">
                              <h4 className="text-xs font-black text-slate-800">Session schedule</h4>
                              <span className="text-[9px] font-semibold text-slate-400">India Standard Time</span>
                            </div>

                            <div className="grid gap-2">
                              {Array.from({ length: total }, (_, index) => {
                                const day = resolved.find((session) => session.id === ids[index]);
                                const done =
                                  day && ["ENDED", "COMPLETED"].includes(String(day.status));
                                const dayAccess = day ? studentAccess(day, clock) : null;

                                return (
                                  <div
                                    key={ids[index] || index}
                                    onClick={(event) => event.stopPropagation()}
                                    className={`flex flex-col gap-3 rounded-2xl border p-3.5 sm:flex-row sm:items-center sm:justify-between ${
                                      dayAccess?.allowed
                                        ? "border-indigo-200 bg-indigo-50/45"
                                        : "border-slate-100 bg-slate-50/55"
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[10px] font-black ${
                                        done
                                          ? "bg-emerald-100 text-emerald-700"
                                          : dayAccess?.allowed
                                            ? "bg-indigo-600 text-white"
                                            : "bg-white text-slate-500 shadow-sm"
                                      }`}>
                                        {done ? <CheckCircle2 size={15} /> : String(index + 1).padStart(2, "0")}
                                      </span>
                                      <div>
                                        <p className="text-xs font-black text-slate-800">Day {index + 1}</p>
                                        <p className="mt-1 text-[10px] font-semibold text-slate-400">
                                          {formatDate(day?.date || (index === 0 ? demo.date : undefined))}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                                      <div className="text-left sm:text-right">
                                        <p className="text-[10px] font-black text-slate-700">
                                          {day?.startTime || (index === 0 ? demo.startTime : "") || "Pending"}
                                          {day?.endTime ? ` – ${day.endTime}` : ""}
                                        </p>
                                        <p className={`mt-1 text-[9px] font-bold ${
                                          done
                                            ? "text-emerald-600"
                                            : day?.status === "CANCELLED"
                                              ? "text-rose-500"
                                              : dayAccess?.allowed
                                                ? "text-indigo-600"
                                                : "text-slate-400"
                                        }`}>
                                          {done
                                            ? "Completed"
                                            : day?.status === "CANCELLED"
                                              ? "Cancelled"
                                              : dayAccess?.allowed
                                                ? "Ready to join"
                                                : day
                                                  ? statusLabel(day.status)
                                                  : "Schedule pending"}
                                        </p>
                                      </div>

                                      {day && dayAccess?.allowed && joinControl(day, true)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="mt-5" onClick={(event) => event.stopPropagation()}>
                            {Number(demo.finalPrice) > 0 && demo.paymentStatus !== "PAID" ? (
                              <DemoPayment bookingId={demo.id} amount={Number(demo.finalPrice)} />
                            ) : complete ? (
                              <div className="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-2 text-xs font-black text-emerald-700">
                                  <CheckCircle2 size={17} />
                                  Your booked demo sessions are complete.
                                </div>
                                {demo.membershipStatus !== "ACTIVE" && (
                                  <a href="#learning-plans" className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800">
                                    View plans <ArrowRight size={13} />
                                  </a>
                                )}
                              </div>
                            ) : !demo.batchId ? (
                              <div className="rounded-2xl bg-amber-50 p-4 text-xs font-semibold text-amber-800">Demo booked. We?re finding the best batch for your preferred slot. Classroom access opens after allocation.</div>
                            ) : current ? (
                              <div>
                                {joinControl(current)}
                                {!studentAccess(current, clock).allowed && (
                                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[10px] font-semibold leading-4 text-amber-700">
                                    <Clock3 size={13} className="mt-0.5 shrink-0" />
                                    Your classroom is booked. The join button activates according to the classroom access time.
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="rounded-2xl bg-slate-50 p-4 text-center">
                                <button
                                  disabled
                                  className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-[10px] font-black text-slate-400"
                                >
                                  <Video size={14} /> Join demo
                                </button>
                                <p className="mt-2 text-[10px] font-semibold text-slate-400">
                                  Your classroom is being prepared. It will appear here as soon as it is ready.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {activeDemos.length > 0 && (
                <Link
                  href="/demo-booking"
                  className="mt-4 flex items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 transition hover:border-indigo-200 hover:bg-indigo-50/30"
                >
                  <span>
                    <strong className="block text-xs font-black text-slate-800">Want to try another subject?</strong>
                    <small className="mt-1 block text-[10px] font-semibold text-slate-400">Choose another demo at a time that suits you.</small>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-600">
                    Book demo <ArrowRight size={13} />
                  </span>
                </Link>
              )}
            </section>

            {/* PURCHASED / NORMAL CLASSES */}
            {isRegular && (purchased.length > 0 || regularClasses.length > 0) && (
              <section id="classes" aria-labelledby="purchased-classes">
                <div className="mb-4">
                  <h2 id="purchased-classes" className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                    Your classes
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Memberships and scheduled live lessons.
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {purchased.map((booking) => (
                    <article key={booking.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active membership
                      </span>
                      <h3 className="mt-4 text-lg font-black text-slate-950">{formatSubjects(booking.subjects)}</h3>
                      <p className="mt-1 text-[11px] font-semibold text-slate-400">
                        {booking.teacherName || "Your assigned teacher"}
                        {booking.classNumber ? ` · Class ${booking.classNumber}` : ""}
                      </p>
                      {!regularClasses.some((session) => session.batchId === booking.batchId) && (
                        <div className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-[10px] font-semibold text-amber-700">
                          Your class schedule is being prepared. Session dates will appear here.
                        </div>
                      )}
                    </article>
                  ))}

                  {regularClasses.map((session) => (
                    <article
                      key={session.id}
                      className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-100 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-indigo-700">
                          Scheduled class
                        </span>
                        <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black ${statusClass(session.status)}`}>
                          {statusLabel(session.status)}
                        </span>
                      </div>
                      <h3 className="mt-4 text-lg font-black text-slate-950">
                        {session.title || session.subject || "Live class"}
                      </h3>
                      <p className="mt-1 text-[11px] font-semibold text-slate-400">
                        {session.teacherName || "Your assigned teacher"}
                        {session.classNumber ? ` · Class ${session.classNumber}` : ""}
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-[10px] font-bold text-slate-600">
                          <CalendarDays size={14} className="text-indigo-500" /> {formatDate(session.date)}
                        </div>
                        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-[10px] font-bold text-slate-600">
                          <Clock3 size={14} className="text-indigo-500" />
                          {session.startTime || "Pending"}{session.endTime ? ` – ${session.endTime}` : ""}
                        </div>
                      </div>
                      <div className="mt-4">{joinControl(session)}</div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>

          {!isRegular && completedDemoForOffer && <aside id="learning-plans"><DemoPurchaseOffer bookingId={completedDemoForOffer.id} endedAt={completedDemoForOffer.demoCompletedAt || completedDemoFallbackSession?.endedAt} /></aside>}
          {isRegular && ["EXPIRED", "CANCELLED"].includes(student?.subscriptionStatus || "") && <aside className="rounded-2xl bg-amber-50 p-5">Your plan has expired. Contact your learning team to renew your plan.</aside>}
          {/* RIGHT SIDE: PLANS */}
          {/* <aside id="learning-plans" className="xl:sticky xl:top-5 xl:self-start">
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              <div className="border-b border-slate-100 p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <Layers3 size={19} />
                  </span>
                  <div>
                    <h2 className="text-base font-black text-slate-950">Learning plans</h2>
                    <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                      Choose your pace after the demo.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                {completedDemoForOffer ? (
                  <DemoPurchaseOffer
                    bookingId={completedDemoForOffer.id}
                    endedAt={
                      completedDemoForOffer.demoCompletedAt ||
                      completedDemoSessions.at(-1)?.endedAt ||
                      completedDemoFallbackSession?.endedAt
                    }
                  />
                ) : (
                  <div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-black text-slate-800">Preview your options</p>
                      <p className="mt-1 text-[10px] leading-4 text-slate-500">
                        Complete your demo first. Then you can choose the weekly pace and plan duration that suits you.
                      </p>
                    </div>

                    <div className="mt-4 space-y-3">
                      {[3, 6].map((days) => {
                        const prices = Object.values(platform.plans)
                          .filter((p) => p.classesPerWeek === days)
                          .sort((a, b) => a.months - b.months);

                        return (
                          <div key={days} className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex items-center justify-between">
                              <h3 className="text-xs font-black text-slate-800">{days} days / week</h3>
                              {days === 6 && (
                                <span className="rounded-full bg-indigo-50 px-2 py-1 text-[8px] font-black text-indigo-600">
                                  MORE PRACTICE
                                </span>
                              )}
                            </div>

                            <div className="mt-3 space-y-2">
                              {prices.map((plan) => (
                                <div key={`${days}-${plan.months}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                                  <span className="text-[10px] font-bold text-slate-500">
                                    {plan.months} {plan.months === 1 ? "month" : "months"}
                                  </span>
                                  <strong className="text-xs font-black text-slate-900">
                                    {new Intl.NumberFormat("en-IN", {
                                      style: "currency",
                                      currency: "INR",
                                      maximumFractionDigits: 0,
                                    }).format(plan.regular)}
                                  </strong>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {!upcomingDemos.length && (
                      <Link
                        href="/demo-booking"
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-indigo-600"
                      >
                        Start with a demo <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-[22px] border border-indigo-100 bg-indigo-50/70 p-4">
              <div className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm">
                  <MessageCircle size={16} />
                </span>
                <div>
                  <p className="text-xs font-black text-slate-800">Need help?</p>
                  <p className="mt-1 text-[10px] leading-4 text-slate-500">
                    Your teacher and learning team will guide you through the demo and next steps.
                  </p>
                </div>
              </div>
            </div>
          </aside> */}
        </div>
      </div>
    </main>
  );
}

function PlanExplanation() {

  return <div className={styles.planExplanation}><div><h3>Choose your weekly pace</h3><p><strong>3 days a week:</strong> a lighter schedule with days between lessons for independent practice.</p><p><strong>6 days a week:</strong> more frequent lessons for a near-daily learning routine.</p></div><div><h3>Choose how long to continue</h3><p><strong>1 month:</strong> the shortest commitment. <strong>3 months:</strong> a longer term. <strong>6 months:</strong> the longest term with fewer renewals.</p><p>Plans differ by weekly frequency and duration. Eligible multi-month demo offers reduce the total price; they do not add extra features.</p></div></div>;

}
