"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Users,
  Video,
} from "lucide-react";
import { auth, db } from "@/lib/firebase/client";

type Batch = {
  id: string;
  name: string;
  subject?: string;
  grade?: string;
  className?: string;
  board?: string;
  studentIds: string[];
  teacherId?: string;
  status?: string;
  schedule?: any;
};

type Student = {
  id: string;
  name: string;
  email?: string;
  grade?: string;
};

type ClassSession = {
  id: string;
  title: string;
  subject: string;
  status: string;
  scheduledAt: any;
  durationMinutes: number;
  studentIds: string[];
};

export default function TeacherBatchDetailsPage() {
  const params = useParams();
  const batchId = String(params.id || "");

  const [uid, setUid] = useState<string | null>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      setUid(user.uid);

      if (batchId) {
        await loadBatch(user.uid, batchId, true);
      }
    });

    return () => unsubscribe();
  }, [batchId]);

  async function loadBatch(
    teacherUid: string,
    id: string,
    initial = false
  ) {
    if (initial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    try {
      const batchRef = doc(db, "batches", id);
      const batchSnap = await getDoc(batchRef);

      if (!batchSnap.exists()) {
        setBatch(null);
        setError("Batch not found.");
        return;
      }

      const data = batchSnap.data();

      if (
        data.teacherId &&
        data.teacherId !== teacherUid
      ) {
        setBatch(null);
        setError(
          "You are not assigned to this batch."
        );
        return;
      }

      const studentIds = extractStudentIds(data);

      const batchData: Batch = {
        id: batchSnap.id,
        name:
          data.name ||
          data.title ||
          data.batchName ||
          "Untitled Batch",
        subject: data.subject,
        grade:
          data.grade ||
          data.class ||
          data.className,
        className: data.className,
        board: data.board,
        studentIds,
        teacherId: data.teacherId,
        status: data.status || "ACTIVE",
        schedule:
          data.schedule ||
          data.slots ||
          null,
      };

      setBatch(batchData);

      await Promise.all([
        loadStudents(studentIds),
        loadSessions(teacherUid, id),
      ]);
    } catch (err) {
      console.error(
        "Batch details error:",
        err
      );

      setError(
        "Unable to load batch details."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadStudents(
    studentIds: string[]
  ) {
    if (studentIds.length === 0) {
      setStudents([]);
      return;
    }

    const result: Student[] = [];

    for (const studentId of studentIds) {
      try {
        const studentSnap = await getDoc(
          doc(db, "students", studentId)
        );

        if (!studentSnap.exists()) {
          continue;
        }

        const data = studentSnap.data();

        result.push({
          id: studentId,
          name:
            data.name ||
            data.displayName ||
            "Student",
          email: data.email,
          grade:
            data.grade ||
            data.class ||
            data.className,
        });
      } catch (error) {
        console.error(
          `Failed to load student ${studentId}`,
          error
        );
      }
    }

    setStudents(result);
  }

  async function loadSessions(
    teacherUid: string,
    id: string
  ) {
    try {
      const sessionQuery = query(
        collection(db, "class_sessions"),
        where("teacherId", "==", teacherUid),
        limit(100)
      );

      const snapshot = await getDocs(
        sessionQuery
      );

      const result: ClassSession[] = snapshot.docs
        .map((item) => {
          const data = item.data();

          return {
            id: item.id,
            title:
              data.title ||
              "Live Class",
            subject:
              data.subject ||
              "General",
            status:
              data.status ||
              "SCHEDULED",
            scheduledAt:
              data.scheduledAt || null,
            durationMinutes:
              typeof data.durationMinutes === "number"
                ? data.durationMinutes
                : 60,
            studentIds:
              Array.isArray(data.studentIds)
                ? data.studentIds
                : [],
          };
        })
        .filter((session) => {
          const data = snapshot.docs.find(
            (doc) => doc.id === session.id
          )?.data();

          return data?.batchId === id;
        });

      result.sort(
        (a, b) =>
          getTimestamp(a.scheduledAt) -
          getTimestamp(b.scheduledAt)
      );

      setSessions(result);
    } catch (error) {
      console.error(
        "Failed to load batch sessions:",
        error
      );

      setSessions([]);
    }
  }

  const upcomingSessions = useMemo(() => {
    const now = Date.now();

    return sessions
      .filter((session) => {
        const time = getTimestamp(
          session.scheduledAt
        );

        return (
          (time === 0 || time >= now) &&
          session.status !== "ENDED" &&
          session.status !== "CANCELLED"
        );
      })
      .slice(0, 5);
  }, [sessions]);

  const completedSessions = useMemo(() => {
    return sessions
      .filter(
        (session) =>
          session.status === "ENDED"
      )
      .slice(-5)
      .reverse();
  }, [sessions]);

  if (loading) {
    return (
      <PageState>
        <Loader2
          size={30}
          className="animate-spin text-blue-600"
        />

        <p className="mt-3 text-sm text-slate-500">
          Loading batch...
        </p>
      </PageState>
    );
  }

  if (!uid) {
    return (
      <PageState>
        <Users
          size={38}
          className="text-slate-300"
        />

        <h1 className="mt-4 text-xl font-black text-slate-950">
          Teacher login required
        </h1>

        <Link
          href="/teacher-auth"
          className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white"
        >
          Teacher Login
        </Link>
      </PageState>
    );
  }

  if (!batch) {
    return (
      <PageState>
        <BookOpen
          size={40}
          className="text-slate-300"
        />

        <h1 className="mt-4 text-xl font-black text-slate-950">
          Batch not found
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          {error ||
            "This batch does not exist or is not assigned to you."}
        </p>

        <Link
          href="/batches"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white"
        >
          <ArrowLeft size={15} />
          Back to Batches
        </Link>
      </PageState>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/batches"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft size={17} />
            </Link>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                Batch Details
              </p>

              <h1 className="truncate text-lg font-black text-slate-950">
                {batch.name}
              </h1>
            </div>
          </div>

          <button
            onClick={() =>
              uid &&
              loadBatch(uid, batchId)
            }
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            <span className="hidden sm:block">
              Refresh
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Batch overview */}
        <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">
                  {batch.status || "ACTIVE"}
                </span>

                {batch.board && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-600">
                    {batch.board}
                  </span>
                )}
              </div>

              <h2 className="mt-3 text-2xl font-black text-slate-950">
                {batch.name}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {batch.subject ||
                  "Subject not specified"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <OverviewStat
                icon={<Users size={17} />}
                label="Students"
                value={batch.studentIds.length}
              />

              <OverviewStat
                icon={<Video size={17} />}
                label="Classes"
                value={sessions.length}
              />

              <OverviewStat
                icon={<BookOpen size={17} />}
                label="Completed"
                value={completedSessions.length}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
            <InfoItem
              icon={<BookOpen size={15} />}
              label="Class"
              value={
                batch.grade ||
                batch.className ||
                "Not specified"
              }
            />

            <InfoItem
              icon={<CalendarDays size={15} />}
              label="Schedule"
              value={getScheduleText(
                batch.schedule
              )}
            />

            <InfoItem
              icon={<Users size={15} />}
              label="Batch Size"
              value={`${batch.studentIds.length} student${
                batch.studentIds.length !== 1
                  ? "s"
                  : ""
              }`}
            />
          </div>
        </section>

        {/* Students */}
        <section className="mt-6 rounded-[26px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-base font-black text-slate-950">
              Students
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Students assigned to this batch.
            </p>
          </div>

          {students.length === 0 ? (
            <EmptySection
              icon={<Users size={28} />}
              title="No student details available"
              description="Student profiles will appear here once they are assigned."
            />
          ) : (
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-black text-blue-700">
                      {getInitials(
                        student.name
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-800">
                        {student.name}
                      </p>

                      {student.email && (
                        <p className="truncate text-[11px] text-slate-500">
                          {student.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <Link href={`/teacher-chat/${encodeURIComponent(student.id)}`} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">Message student <ArrowRight size={13}/></Link>

                  {student.grade && (
                    <p className="mt-3 text-[11px] font-bold text-slate-500">
                      {student.grade}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming */}
        <section className="mt-6 rounded-[26px] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="text-base font-black text-slate-950">
                Upcoming Classes
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Scheduled classes for this batch.
              </p>
            </div>
          </div>

          {upcomingSessions.length === 0 ? (
            <EmptySection
              icon={<CalendarDays size={28} />}
              title="No upcoming classes"
              description="Upcoming class sessions will appear here."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingSessions.map(
                (session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                  />
                )
              )}
            </div>
          )}
        </section>

        {/* Completed */}
        <section className="mt-6 rounded-[26px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-base font-black text-slate-950">
              Recent Completed Classes
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Recently completed sessions.
            </p>
          </div>

          {completedSessions.length === 0 ? (
            <EmptySection
              icon={<CheckCircle2 size={28} />}
              title="No completed classes"
              description="Completed sessions will appear here."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {completedSessions.map(
                (session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    completed
                  />
                )
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function SessionRow({
  session,
  completed = false,
}: {
  session: ClassSession;
  completed?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {completed ? (
            <CheckCircle2 size={19} />
          ) : (
            <Video size={19} />
          )}
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-slate-900">
            {session.title}
          </h3>

          <p className="mt-1 text-xs font-bold text-blue-600">
            {session.subject}
          </p>

          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <CalendarDays size={13} />
              {formatDate(
                session.scheduledAt
              )}
            </span>

            <span className="flex items-center gap-1">
              <Clock3 size={13} />
              {session.durationMinutes} min
            </span>

            <span className="flex items-center gap-1">
              <Users size={13} />
              {session.studentIds.length}
            </span>
          </div>
        </div>
      </div>

      {!completed && (
        <Link
          href={`/studio/${session.id}`}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white hover:bg-blue-500"
        >
          Open Class
          <ArrowRight size={14} />
        </Link>
      )}

      {completed && (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-700">
          <CheckCircle2 size={13} />
          Completed
        </span>
      )}
    </div>
  );
}

function OverviewStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="flex items-center gap-1.5 text-blue-600">
        {icon}

        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
          {label}
        </span>
      </div>

      <p className="mt-1 text-lg font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}

        <span className="text-[9px] font-black uppercase tracking-wider">
          {label}
        </span>
      </div>

      <p className="mt-1 truncate text-xs font-bold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function EmptySection({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        {icon}
      </div>

      <p className="mt-3 text-sm font-black text-slate-700">
        {title}
      </p>

      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-400">
        {description}
      </p>
    </div>
  );
}

function PageState({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      {children}
    </div>
  );
}

function extractStudentIds(
  data: Record<string, any>
): string[] {
  if (Array.isArray(data.studentIds)) {
    return data.studentIds.filter(
      (id: unknown): id is string =>
        typeof id === "string"
    );
  }

  if (Array.isArray(data.students)) {
    return data.students
      .map((student: any) =>
        typeof student === "string"
          ? student
          : student?.id
      )
      .filter(
        (id: unknown): id is string =>
          typeof id === "string"
      );
  }

  return [];
}

function getTimestamp(value: any): number {
  if (!value) return 0;

  try {
    if (
      typeof value.toMillis === "function"
    ) {
      return value.toMillis();
    }

    if (
      typeof value.toDate === "function"
    ) {
      return value.toDate().getTime();
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? 0
      : date.getTime();
  } catch {
    return 0;
  }
}

function formatDate(value: any) {
  const timestamp = getTimestamp(value);

  if (!timestamp) {
    return "Date not scheduled";
  }

  return new Date(timestamp).toLocaleString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function getScheduleText(
  schedule: any
): string {
  if (!schedule) {
    return "Not set";
  }

  if (typeof schedule === "string") {
    return schedule;
  }

  if (Array.isArray(schedule)) {
    if (schedule.length === 0) {
      return "Not set";
    }

    return schedule
      .slice(0, 2)
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (!item || typeof item !== "object") {
          return String(item);
        }

        return [
          item.day ||
            item.weekday ||
            item.date,
          item.time ||
            item.slot ||
            item.startTime,
        ]
          .filter(Boolean)
          .join(" · ");
      })
      .filter(Boolean)
      .join(", ");
  }

  if (
    typeof schedule === "object"
  ) {
    return Object.entries(schedule)
      .slice(0, 2)
      .map(
        ([day, time]) =>
          `${day}: ${String(time)}`
      )
      .join(", ");
  }

  return "Not set";
}
