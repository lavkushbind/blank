"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase/client";

import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  Loader2,
  Menu,
  Play,
  RefreshCw,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

/* =========================================================
   TYPES
========================================================= */

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

interface ClassSession {
  id: string;

  batchId?: string;
  teacherId?: string;
  studentIds?: string[];

  title?: string;
  subject?: string;

  status?: SessionStatus;

  scheduledAt?: unknown;
  durationMinutes?: number;

  liveRoomId?: string;
  livekitRoomName?: string;

  createdAt?: unknown;
  updatedAt?: unknown;
}

interface TeacherProfile {
  uid?: string;

  name?: string;
  displayName?: string;

  photoURL?: string;
  avatarUrl?: string;

  subjects?: string[];
  boards?: string[];
  classesTaught?: string[];

  rating?: number;
}

interface ClassItem {
  session: ClassSession;
  teacher: TeacherProfile | null;
}

type FilterType =
  | "ALL"
  | "UPCOMING"
  | "LIVE"
  | "COMPLETED";

/* =========================================================
   HELPERS
========================================================= */

function getTimestampMillis(value: unknown): number {
  if (!value) {
    return 0;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toMillis" in value &&
    typeof (value as { toMillis?: unknown }).toMillis ===
      "function"
  ) {
    return (
      value as {
        toMillis: () => number;
      }
    ).toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    const time = new Date(value).getTime();

    return Number.isNaN(time) ? 0 : time;
  }

  if (typeof value === "number") {
    return value;
  }

  return 0;
}

function formatDate(value: unknown) {
  const millis = getTimestampMillis(value);

  if (!millis) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(millis));
}

function formatTime(value: unknown) {
  const millis = getTimestampMillis(value);

  if (!millis) {
    return "Time unavailable";
  }

  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(millis));
}

function formatShortDate(value: unknown) {
  const millis = getTimestampMillis(value);

  if (!millis) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(new Date(millis));
}

function getRelativeTime(value: unknown) {
  const millis = getTimestampMillis(value);

  if (!millis) {
    return "";
  }

  const difference = millis - Date.now();

  if (difference <= 0) {
    return "Starting now";
  }

  const minutes = Math.floor(
    difference / 60000
  );

  if (minutes < 60) {
    return `Starts in ${minutes} min`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  if (hours < 24) {
    return `Starts in ${hours} hr`;
  }

  const days = Math.floor(
    hours / 24
  );

  if (days === 1) {
    return "Tomorrow";
  }

  return `In ${days} days`;
}

function formatSubject(subject?: string) {
  if (!subject) {
    return "Live class";
  }

  switch (subject.toUpperCase()) {
    case "MATH":
    case "MATHEMATICS":
      return "Mathematics";

    case "SCIENCE":
      return "Science";

    case "ENGLISH":
      return "English";

    default:
      return subject;
  }
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "S";
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

function getStatusLabel(
  status?: SessionStatus
) {
  switch (status) {
    case "LIVE":
      return "Live now";

    case "OPEN_FOR_JOIN":
      return "Ready to join";

    case "PREPARING":
      return "Preparing";

    case "SCHEDULED":
      return "Scheduled";

    case "ENDED":
    case "COMPLETED":
      return "Completed";

    case "CANCELLED":
      return "Cancelled";

    case "PAUSED":
      return "Paused";

    case "TECHNICAL_ISSUE":
      return "Technical issue";

    case "PROCESSING":
      return "Processing";

    default:
      return "Scheduled";
  }
}

function isCompletedStatus(
  status?: SessionStatus
) {
  return (
    status === "ENDED" ||
    status === "COMPLETED" ||
    status === "CANCELLED"
  );
}

function isLiveStatus(
  status?: SessionStatus
) {
  return (
    status === "LIVE" ||
    status === "OPEN_FOR_JOIN"
  );
}

function isUpcomingStatus(
  status?: SessionStatus
) {
  return (
    status === "SCHEDULED" ||
    status === "PREPARING"
  );
}

/* =========================================================
   SKELETON
========================================================= */

function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={[
        "animate-pulse rounded-xl bg-slate-100",
        className,
      ].join(" ")}
    />
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  filter,
}: {
  filter: FilterType;
}) {
  const content = {
    ALL: {
      title: "No classes yet",
      description:
        "Your scheduled live classes will appear here once you are enrolled in a batch.",
    },

    UPCOMING: {
      title: "No upcoming classes",
      description:
        "You don't have any scheduled classes right now.",
    },

    LIVE: {
      title: "No live class right now",
      description:
        "When your teacher opens a classroom, it will appear here.",
    },

    COMPLETED: {
      title: "No completed classes",
      description:
        "Your completed learning sessions will appear here after you attend classes.",
    },
  }[filter];

  return (
    <div className="rounded-[24px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#2864E8]">
        <CalendarDays size={20} />
      </div>

      <h3 className="mt-4 text-base font-black text-slate-900">
        {content.title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {content.description}
      </p>

      <Link
        href="/demo-booking"
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[#2864E8] px-4 text-xs font-black text-white transition hover:bg-[#1F55C8]"
      >
        Book a live demo
        <ArrowUpRight size={14} />
      </Link>
    </div>
  );
}

/* =========================================================
   CLASS CARD
========================================================= */

function ClassCard({
  item,
}: {
  item: ClassItem;
}) {
  const {
    session,
    teacher,
  } = item;

  const live =
    session.status === "LIVE";

  const canJoin =
    session.status === "LIVE" ||
    session.status === "OPEN_FOR_JOIN";

  const teacherName =
    teacher?.name ||
    teacher?.displayName ||
    "Your teacher";

  const teacherImage =
    teacher?.photoURL ||
    teacher?.avatarUrl;

  return (
    <article
      className={[
        "group overflow-hidden rounded-[24px] border bg-white transition",
        live
          ? "border-[#2864E8]/30 shadow-[0_12px_40px_rgba(40,100,232,.08)]"
          : "border-slate-200 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(15,23,42,.05)]",
      ].join(" ")}
    >
      {live && (
        <div className="h-1 bg-[#2864E8]" />
      )}

      <div className="p-5 sm:p-6">

        {/* TOP */}

        <div className="flex items-start justify-between gap-4">

          <div className="flex min-w-0 items-start gap-4">

            <div
              className={[
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                live
                  ? "bg-[#2864E8] text-white"
                  : "bg-[#EEF4FF] text-[#2864E8]",
              ].join(" ")}
            >
              {live ? (
                <Play
                  size={19}
                  fill="currentColor"
                />
              ) : (
                <BookOpen
                  size={20}
                />
              )}
            </div>

            <div className="min-w-0">

              <div className="flex flex-wrap items-center gap-2">

                <span
                  className={[
                    "rounded-md px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em]",
                    live
                      ? "bg-[#EAFBF5] text-[#079669]"
                      : session.status ===
                          "OPEN_FOR_JOIN"
                        ? "bg-[#EEF4FF] text-[#2864E8]"
                        : session.status ===
                            "CANCELLED"
                          ? "bg-red-50 text-red-600"
                          : "bg-slate-100 text-slate-500",
                  ].join(" ")}
                >
                  {getStatusLabel(
                    session.status
                  )}
                </span>

                <span className="text-xs font-semibold text-slate-400">
                  {formatSubject(
                    session.subject
                  )}
                </span>

              </div>

              <h3 className="mt-2 truncate text-lg font-black tracking-tight text-slate-900">
                {session.title ||
                  formatSubject(
                    session.subject
                  )}
              </h3>

            </div>
          </div>

          <span className="hidden shrink-0 text-xs font-bold text-slate-400 sm:block">
            {session.durationMinutes ||
              60}{" "}
            min
          </span>

        </div>

        {/* DATE / TIME */}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">

          <div className="rounded-2xl bg-[#F7F9FC] p-3.5">

            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
              <CalendarDays size={13} />
              Date
            </div>

            <p className="mt-1.5 text-sm font-black text-slate-800">
              {formatShortDate(
                session.scheduledAt
              )}
            </p>

            <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
              {formatDate(
                session.scheduledAt
              )}
            </p>

          </div>

          <div className="rounded-2xl bg-[#F7F9FC] p-3.5">

            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
              <Clock3 size={13} />
              Time
            </div>

            <p className="mt-1.5 text-sm font-black text-slate-800">
              {formatTime(
                session.scheduledAt
              )}
            </p>

            <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
              {session.durationMinutes ||
                60}{" "}
              minute class
            </p>

          </div>

        </div>

        {/* TEACHER */}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">

          <div className="flex min-w-0 items-center gap-3">

            {teacherImage ? (
              <img
                src={teacherImage}
                alt={teacherName}
                className="h-9 w-9 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#080D1D] text-[10px] font-black text-white">
                {getInitials(
                  teacherName
                )}
              </div>
            )}

            <div className="min-w-0">

              <p className="truncate text-xs font-black text-slate-800">
                {teacherName}
              </p>

              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">

                <GraduationCap
                  size={12}
                />

                Teacher

                {typeof teacher?.rating ===
                  "number" && (
                  <>
                    <span>·</span>
                    <span>
                      {teacher.rating}
                    </span>
                  </>
                )}

              </div>

            </div>
          </div>

          <div className="text-right">
            {live ? (
              <p className="text-xs font-black text-[#079669]">
                Teacher is live
              </p>
            ) : session.status ===
              "OPEN_FOR_JOIN" ? (
              <p className="text-xs font-black text-[#2864E8]">
                Ready to join
              </p>
            ) : (
              <p className="text-xs font-bold text-slate-500">
                {getRelativeTime(
                  session.scheduledAt
                )}
              </p>
            )}
          </div>

        </div>

        {/* ACTION */}

        <div className="mt-5">

          {canJoin ? (
            <Link
              href={`/classroom/${session.id}`}
              className={[
                "flex h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-black transition",
                live
                  ? "bg-[#2864E8] text-white shadow-[0_8px_22px_rgba(40,100,232,.2)] hover:bg-[#1F55C8]"
                  : "border border-[#2864E8] bg-[#EEF4FF] text-[#2864E8] hover:bg-[#E3EDFF]",
              ].join(" ")}
            >
              {live
                ? "Join live class"
                : "Enter classroom"}

              <ArrowUpRight
                size={15}
              />
            </Link>
          ) : session.status ===
            "CANCELLED" ? (
            <div className="flex h-11 w-full items-center justify-center rounded-xl bg-red-50 text-xs font-black text-red-600">
              Class cancelled
            </div>
          ) : isCompletedStatus(
              session.status
            ) ? (
            <Link
              href={`/classroom/${session.id}`}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-700 transition hover:border-slate-300"
            >
              View class
              <ChevronRight
                size={15}
              />
            </Link>
          ) : (
            <Link
              href={`/classroom/${session.id}`}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-700 transition hover:border-[#2864E8] hover:text-[#2864E8]"
            >
              Class details
              <ChevronRight
                size={15}
              />
            </Link>
          )}

        </div>
      </div>
    </article>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function StudentClassesPage() {
  const router = useRouter();

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    mobileMenu,
    setMobileMenu,
  ] = useState(false);

  const [
    filter,
    setFilter,
  ] = useState<FilterType>(
    "UPCOMING"
  );

  const [
    sessions,
    setSessions,
  ] = useState<ClassItem[]>([]);

  const [
    error,
    setError,
  ] = useState("");

  /* =======================================================
     LOAD DATA
  ======================================================= */

  const loadClasses = async (
    userId: string,
    showRefresh = false
  ) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const sessionsQuery =
        query(
          collection(
            db,
            "class_sessions"
          ),
          where(
            "studentIds",
            "array-contains",
            userId
          ),
          limit(100)
        );

      const snapshot =
        await getDocs(
          sessionsQuery
        );

      const rawSessions =
        snapshot.docs
          .map(
            (item) =>
              ({
                id: item.id,
                ...item.data(),
              }) as ClassSession
          )
          .sort((a, b) => {
            const aTime =
              getTimestampMillis(
                a.scheduledAt
              );

            const bTime =
              getTimestampMillis(
                b.scheduledAt
              );

            return bTime - aTime;
          });

      /* -----------------------------------------------
         LOAD TEACHERS
      ----------------------------------------------- */

      const teacherIds = Array.from(
        new Set(
          rawSessions
            .map(
              (session) =>
                session.teacherId
            )
            .filter(
              (
                value
              ): value is string =>
                Boolean(value)
            )
        )
      );

      const teacherEntries =
        await Promise.all(
          teacherIds.map(
            async (teacherId) => {
              try {
                const teacherSnapshot =
                  await getDoc(
                    doc(
                      db,
                      "teachers",
                      teacherId
                    )
                  );

                if (
                  !teacherSnapshot.exists()
                ) {
                  return [
                    teacherId,
                    null,
                  ] as const;
                }

                return [
                  teacherId,
                  {
                    uid: teacherId,
                    ...teacherSnapshot.data(),
                  } as TeacherProfile,
                ] as const;
              } catch {
                return [
                  teacherId,
                  null,
                ] as const;
              }
            }
          )
        );

      const teachers =
        new Map(
          teacherEntries
        );

      const result: ClassItem[] =
        rawSessions.map(
          (session) => ({
            session,
            teacher:
              session.teacherId
                ? teachers.get(
                    session.teacherId
                  ) || null
                : null,
          })
        );

      setSessions(result);
    } catch (err) {
      console.error(
        "Classes page error:",
        err
      );

      setError(
        "Unable to load your classes. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* =======================================================
     AUTH
  ======================================================= */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
          if (!user) {
            router.replace(
              "/student-auth?redirect=/classes"
            );
            return;
          }

          await loadClasses(
            user.uid
          );
        }
      );

    return () =>
      unsubscribe();
  }, [router]);

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredClasses =
    useMemo(() => {
      const now = Date.now();

      return sessions.filter(
        ({ session }) => {
          const status =
            session.status;

          const scheduledTime =
            getTimestampMillis(
              session.scheduledAt
            );

          if (filter === "LIVE") {
            return (
              status === "LIVE" ||
              status === "OPEN_FOR_JOIN"
            );
          }

          if (
            filter === "COMPLETED"
          ) {
            return isCompletedStatus(
              status
            );
          }

          if (
            filter === "UPCOMING"
          ) {
            if (
              status === "SCHEDULED" ||
              status === "PREPARING"
            ) {
              return (
                !scheduledTime ||
                scheduledTime >= now
              );
            }

            return false;
          }

          return true;
        }
      );
    }, [sessions, filter]);

  /* =======================================================
     COUNTS
  ======================================================= */

  const counts =
    useMemo(() => {
      const now = Date.now();

      let upcoming = 0;
      let live = 0;
      let completed = 0;

      for (const {
        session,
      } of sessions) {
        if (
          session.status ===
            "LIVE" ||
          session.status ===
            "OPEN_FOR_JOIN"
        ) {
          live += 1;
          continue;
        }

        if (
          isCompletedStatus(
            session.status
          )
        ) {
          completed += 1;
          continue;
        }

        if (
          session.status ===
            "SCHEDULED" ||
          session.status ===
            "PREPARING"
        ) {
          const time =
            getTimestampMillis(
              session.scheduledAt
            );

          if (
            !time ||
            time >= now
          ) {
            upcoming += 1;
          }
        }
      }

      return {
        upcoming,
        live,
        completed,
      };
    }, [sessions]);

  /* =======================================================
     REFRESH
  ======================================================= */

  const refresh = async () => {
    const user =
      auth.currentUser;

    if (!user) {
      router.replace(
        "/student-auth?redirect=/classes"
      );
      return;
    }

    await loadClasses(
      user.uid,
      true
    );
  };

  /* =======================================================
     FILTER BUTTON
  ======================================================= */

  const filters: {
    key: FilterType;
    label: string;
    count?: number;
  }[] = [
    {
      key: "UPCOMING",
      label: "Upcoming",
      count: counts.upcoming,
    },
    {
      key: "LIVE",
      label: "Live now",
      count: counts.live,
    },
    {
      key: "COMPLETED",
      label: "Completed",
      count: counts.completed,
    },
    {
      key: "ALL",
      label: "All classes",
      count: sessions.length,
    },
  ];

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#080D1D]">

      {/* ===============================================
          MOBILE HEADER
      =============================================== */}

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#F7F9FC]/95 backdrop-blur-xl lg:hidden">

        <div className="flex h-[68px] items-center justify-between px-4">

          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={() =>
                setMobileMenu(true)
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>

            <div>
              <div className="text-[16px] font-black">
                BlankLearn
              </div>

              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-[#2864E8]">
                Live learning
              </div>
            </div>

          </div>

          <Link
            href="/profile"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#080D1D] text-[10px] font-black text-white"
          >
            <BrandLogo className="h-full w-full rounded-[inherit] object-cover" />
          </Link>

        </div>
      </header>

      {/* ===============================================
          MOBILE MENU
      =============================================== */}

      {mobileMenu && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() =>
              setMobileMenu(false)
            }
            className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px] lg:hidden"
          />

          <aside className="fixed inset-y-0 left-0 z-50 w-[280px] bg-white shadow-2xl lg:hidden">

            <div className="flex h-[76px] items-center justify-between border-b border-slate-100 px-5">

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#080D1D] text-xs font-black text-white">
                  <BrandLogo className="h-full w-full rounded-[inherit] object-cover" />
                </div>

                <div>
                  <div className="font-black">
                    BlankLearn
                  </div>

                  <div className="text-[8px] font-black uppercase tracking-[0.18em] text-[#2864E8]">
                    Live learning
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMobileMenu(false)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200"
              >
                <X size={17} />
              </button>

            </div>

            <nav className="space-y-1 p-4">

              {[
                [
                  "/hub",
                  "Home",
                  "Home",
                ],
                [
                  "/classes",
                  "Classes",
                  "Classes",
                ],
                [
                  "/vault",
                  "Study",
                  "Study",
                ],
                [
                  "/homework",
                  "Homework",
                  "Homework",
                ],
                [
                  "/progress",
                  "Progress",
                  "Progress",
                ],
                [
                  "/profile",
                  "Profile",
                  "Profile",
                ],
                [
                  "/settings",
                  "Settings",
                  "Settings",
                ],
              ].map(
                ([href, label]) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() =>
                      setMobileMenu(
                        false
                      )
                    }
                    className={[
                      "block rounded-xl px-4 py-3 text-sm font-bold",
                      href ===
                        "/classes"
                        ? "bg-[#EEF4FF] text-[#2864E8]"
                        : "text-slate-500 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {label}
                  </Link>
                )
              )}

            </nav>
          </aside>
        </>
      )}

      {/* ===============================================
          DESKTOP LAYOUT
      =============================================== */}

      <div className="mx-auto flex min-h-screen max-w-[1500px]">

        {/* DESKTOP SIDEBAR */}

        <aside className="sticky top-0 hidden h-screen w-[244px] shrink-0 border-r border-slate-200 bg-white lg:block">

          <div className="flex h-[76px] items-center border-b border-slate-100 px-6">

            <Link
              href="/hub"
              className="flex items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#080D1D] text-xs font-black text-white">
                <BrandLogo className="h-full w-full rounded-[inherit] object-cover" />
              </div>

              <div>
                <div className="text-[17px] font-black">
                  BlankLearn
                </div>

                <div className="text-[8px] font-black uppercase tracking-[0.2em] text-[#2864E8]">
                  Live learning
                </div>
              </div>
            </Link>

          </div>

          <nav className="p-4">

            <p className="px-3 pb-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Learning
            </p>

            {[
              [
                "/hub",
                "Home",
              ],
              [
                "/classes",
                "Classes",
              ],
              [
                "/vault",
                "Study",
              ],
              [
                "/homework",
                "Homework",
              ],
              [
                "/progress",
                "Progress",
              ],
            ].map(
              ([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "mb-1 block rounded-xl px-3.5 py-3 text-sm font-bold transition",
                    href ===
                      "/classes"
                      ? "bg-[#EEF4FF] text-[#2864E8]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-950",
                  ].join(" ")}
                >
                  {label}
                </Link>
              )
            )}

            <p className="px-3 pb-3 pt-8 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Account
            </p>

            <Link
              href="/profile"
              className="mb-1 flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50"
            >
              <UserRound size={17} />
              Profile
            </Link>

          </nav>

        </aside>

        {/* =============================================
            CONTENT
        ============================================= */}

        <main className="min-w-0 flex-1">

          {/* TOP BAR */}

          <div className="sticky top-0 z-30 hidden h-[76px] items-center justify-between border-b border-slate-200/80 bg-[#F7F9FC]/95 px-8 backdrop-blur-xl lg:flex">

            <div>
              <p className="text-xs font-semibold text-slate-400">
                Student learning space
              </p>

              <h1 className="text-[15px] font-black">
                Classes & Schedule
              </h1>
            </div>

            <div className="flex items-center gap-3">

              <button
                type="button"
                onClick={refresh}
                disabled={refreshing}
                className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:border-slate-300 disabled:opacity-50"
              >
                <RefreshCw
                  size={14}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                Refresh
              </button>

              <Link
                href="/profile"
                className="flex h-10 items-center gap-2 rounded-xl bg-white px-3 text-xs font-black text-slate-700"
              >
                <UserRound
                  size={15}
                />
                Profile
              </Link>

            </div>
          </div>

          {/* PAGE CONTENT */}

          <div className="mx-auto max-w-[1250px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">

            {/* HERO */}

            <section className="mb-7">

              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

                <div>

                  <div className="inline-flex items-center gap-2 rounded-full bg-[#EEF4FF] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#2864E8]">
                    <Sparkles
                      size={12}
                    />
                    Your learning schedule
                  </div>

                  <h2 className="mt-3 text-[30px] font-black tracking-[-0.04em] sm:text-[38px]">
                    Classes
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    See your live classes, upcoming
                    sessions and completed learning
                    sessions in one place.
                  </p>

                </div>

                <Link
                  href="/demo-booking"
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2864E8] px-5 text-xs font-black text-white shadow-[0_8px_24px_rgba(40,100,232,.18)] transition hover:bg-[#1F55C8]"
                >
                  Book a demo
                  <ArrowUpRight
                    size={15}
                  />
                </Link>

              </div>

            </section>

            {/* FILTERS */}

            <section className="mb-6">

              <div className="flex gap-2 overflow-x-auto pb-1">

                {filters.map(
                  (item) => {
                    const active =
                      filter ===
                      item.key;

                    return (
                      <button
                        key={
                          item.key
                        }
                        type="button"
                        onClick={() =>
                          setFilter(
                            item.key
                          )
                        }
                        className={[
                          "flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-black transition",
                          active
                            ? "bg-[#080D1D] text-white"
                            : "border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900",
                        ].join(" ")}
                      >
                        {item.label}

                        {typeof item.count ===
                          "number" && (
                          <span
                            className={[
                              "rounded-md px-1.5 py-0.5 text-[9px]",
                              active
                                ? "bg-white/10 text-white"
                                : "bg-slate-100 text-slate-500",
                            ].join(
                              " "
                            )}
                          >
                            {
                              item.count
                            }
                          </span>
                        )}
                      </button>
                    );
                  }
                )}

              </div>

            </section>

            {/* ERROR */}

            {error && (
              <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-700 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {error}
                </span>

                <button
                  type="button"
                  onClick={refresh}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-black text-red-700"
                >
                  <RefreshCw
                    size={13}
                  />
                  Retry
                </button>
              </div>
            )}

            {/* LOADING */}

            {loading ? (

              <div className="grid gap-4 md:grid-cols-2">

                {Array.from({
                  length: 4,
                }).map(
                  (_, index) => (
                    <div
                      key={index}
                      className="rounded-[24px] border border-slate-200 bg-white p-6"
                    >
                      <div className="flex gap-4">

                        <Skeleton className="h-12 w-12 rounded-2xl" />

                        <div className="flex-1">

                          <Skeleton className="h-3 w-24" />

                          <Skeleton className="mt-3 h-5 w-52" />

                          <Skeleton className="mt-6 h-20 w-full rounded-2xl" />

                        </div>

                      </div>
                    </div>
                  )
                )}

              </div>

            ) : filteredClasses.length ===
              0 ? (

              <EmptyState
                filter={filter}
              />

            ) : (

              <div className="grid gap-4 md:grid-cols-2">

                {filteredClasses.map(
                  (item) => (
                    <ClassCard
                      key={
                        item.session.id
                      }
                      item={item}
                    />
                  )
                )}

              </div>

            )}

            {/* INFO */}

            {!loading &&
              filter ===
                "UPCOMING" &&
              filteredClasses.length >
                0 && (
                <div className="mt-6 flex items-start gap-3 rounded-[20px] border border-slate-200 bg-white p-4">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#2864E8]">
                    <CheckCircle2
                      size={17}
                    />
                  </div>

                  <div>
                    <p className="text-xs font-black text-slate-800">
                      Class reminder
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-slate-500">
                      Your classroom becomes available
                      when the teacher opens the session.
                      You can join directly from this page.
                    </p>
                  </div>

                </div>
              )}

            {/* MOBILE REFRESH */}

            <div className="mt-6 flex justify-center lg:hidden">

              <button
                type="button"
                onClick={refresh}
                disabled={refreshing}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 disabled:opacity-50"
              >
                {refreshing ? (
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                ) : (
                  <RefreshCw
                    size={14}
                  />
                )}

                Refresh schedule
              </button>

            </div>

            {/* FOOTER */}

            <footer className="flex flex-col gap-2 py-8 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">

              <p>
                © {new Date().getFullYear()} BlankLearn
              </p>

              <div className="flex items-center gap-4">

                <Link
                  href="/hub"
                  className="hover:text-slate-700"
                >
                  Home
                </Link>

                <Link
                  href="/help"
                  className="hover:text-slate-700"
                >
                  Help
                </Link>

                <Link
                  href="/settings"
                  className="hover:text-slate-700"
                >
                  Settings
                </Link>

              </div>

            </footer>

          </div>
        </main>
      </div>
    </div>
  );
}
