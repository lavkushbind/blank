"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  updateDoc,
  where,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

import { auth, db } from "@/lib/firebase/client";

import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  GraduationCap,
  Loader2,
  Play,
  RefreshCw,
  UserRound,
  Users,
  Video,
  WalletCards,
  Check,
  Pencil,
  X,
  Save,
} from "lucide-react";

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

interface Session {
  id: string;

  type?: string;
  title?: string;

  teacherId?: string;
  studentIds?: string[];

  demoBatchId?: string;
  batchId?: string;

  classNumber?: number;
  className?: string;
  board?: string;

  subject?: string;
  subjects?: string[];

  programId?: string;
  demoType?: string;

  date?: string;
  startTime?: string;
  endTime?: string;

  status?: SessionStatus;

  roomName?: string;
  livekitRoomName?: string;
  liveRoomId?: string;

  createdAt?: Timestamp | Date | null;
  updatedAt?: Timestamp | Date | null;
}

interface DemoBooking {
  id: string;

  studentId?: string;
  parentId?: string;
  studentName?: string;

  teacherId?: string;
  teacherName?: string;

  batchId?: string;
  sessionId?: string;
  sessionIds?: string[];
  demoSessionIds?: string[];
  demoSessionCount?: number;
  demoStatus?: string;

  classNumber?: number;
  board?: string;

  subject?: string;
  subjects?: string[];

  programId?: string;
  demoType?: string;

  date?: string;
  startTime?: string;
  endTime?: string;

  status?: string;
  paymentStatus?: string;

  originalPrice?: number;
  discount?: number;
  finalPrice?: number;
  currency?: string;
}

interface Teacher {
  uid?: string;

  name?: string;
  email?: string;
  profilePhotoUrl?: string;

  subjects?: string[];
  grades?: string[];
  classesTaught?: string[];
  boards?: string[];

  applicationStatus?: string;
  kycStatus?: string;
  groupAvailable?: boolean;
  individualAvailable?: boolean;

  experienceYears?: number;
  experienceDescription?: string;
  bio?: string;
  phone?: string;
  city?: string;
  qualification?: string;
  institution?: string;
  graduationYear?: number | null;
  availableDays?: string[];
  availableSlots?: ProfileSlot[];
  demoPrograms?: string[];
  teachingModes?: string[];
  demoVideoUrl?: string;
  teachingApproach?: string;
  kyc?: { idProofType?: string; idProofUrl?: string; qualificationProofUrl?: string };
  payout?: { accountHolderName?: string; upiId?: string };
}

type ProfileSlot = { slotId?: string; dayOfWeek?: string; day?: string; startTime: string; endTime: string; isOccupied?: boolean };
type TeacherProfileDraft = {
  name: string; email: string; phone: string; city: string;
  qualification: string; institution: string; graduationYear: string; experienceYears: string; experienceDescription: string;
  boards: string[]; grades: string[]; subjects: string[]; demoPrograms: string[]; teachingModes: string[];
  availableDays: string[]; availableSlots: ProfileSlot[];
  profilePhotoUrl: string; demoVideoUrl: string; bio: string; teachingApproach: string;
  idProofType: string; idProofUrl: string; qualificationProofUrl: string; accountHolderName: string; upiId: string;
};

const PROFILE_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const PROFILE_BOARDS = ["CBSE", "ICSE", "UP Board", "State Board"];
const PROFILE_GRADES = Array.from({ length: 10 }, (_, index) => `Class ${index + 1}`);
const PROFILE_SUBJECTS = ["Math", "Science", "English"];
const PROFILE_PROGRAMS = ["MATH_ONLY", "ENGLISH_ONLY", "ALL_SUBJECTS"];
const PROFILE_TIMES = Array.from({ length: 16 }, (_, index) => {
  const hour = String(index + 6).padStart(2, "0");
  const nextHour = String(index + 7).padStart(2, "0");
  return [hour + ":00", nextHour + ":00"] as const;
});

function formatProfileTime(value: string) {
  const [hourText, minute = "00"] = value.split(":");
  const hour = Number(hourText);
  if (!Number.isFinite(hour)) return value;
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
}

function normalizeDate(value?: string) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function parseTimeToMinutes(value?: string) {
  if (!value) return 0;

  const raw = value.trim().toUpperCase();

  const match = raw.match(
    /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/,
  );

  if (!match) return 0;

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3];

  if (meridiem === "PM" && hour !== 12) {
    hour += 12;
  }

  if (meridiem === "AM" && hour === 12) {
    hour = 0;
  }

  return hour * 60 + minute;
}

function getDateTime(
  date?: string,
  time?: string,
) {
  if (!date) return 0;

  const d = normalizeDate(date);

  if (!d) return 0;

  const minutes = parseTimeToMinutes(time);

  d.setHours(
    Math.floor(minutes / 60),
    minutes % 60,
    0,
    0,
  );

  return d.getTime();
}

function formatDate(date?: string) {
  if (!date) return "Date not available";

  const d = normalizeDate(date);

  if (!d) return date;

  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatSubjects(
  subjects?: string[],
  subject?: string,
) {
  if (subjects?.length) {
    return subjects.join(" + ");
  }

  if (subject) return subject;

  return "Live Class";
}

function canTeacherJoin(status?: SessionStatus) {
  return (
    status === "SCHEDULED" ||
    status === "PREPARING" ||
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
      return "PREPARING";

    case "SCHEDULED":
      return "SCHEDULED";

    case "ENDED":
    case "COMPLETED":
      return "COMPLETED";

    case "CANCELLED":
      return "CANCELLED";

    default:
      return "SCHEDULED";
  }
}

function statusClass(status?: SessionStatus) {
  switch (status) {
    case "LIVE":
      return "border-red-200 bg-red-50 text-red-700";

    case "OPEN_FOR_JOIN":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "PREPARING":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "CANCELLED":
      return "border-slate-200 bg-slate-100 text-slate-500";

    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center">
      <CalendarDays
        size={28}
        className="mx-auto text-slate-300"
      />

      <h3 className="mt-4 text-sm font-black text-slate-800">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default function TeacherDashboardPage() {
  const router = useRouter();

  const [teacher, setTeacher] =
    useState<Teacher | null>(null);

  const [sessions, setSessions] =
    useState<Session[]>([]);

  const [demos, setDemos] =
    useState<DemoBooking[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [refreshKey, setRefreshKey] =
    useState(0);

  const [startingDemoId, setStartingDemoId] = useState("");
  const [demoActionError, setDemoActionError] = useState<{ id: string; message: string } | null>(null);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileDraft, setProfileDraft] = useState<TeacherProfileDraft>({
    name: "", email: "", phone: "", city: "", qualification: "", institution: "", graduationYear: "", experienceYears: "", experienceDescription: "",
    boards: [], grades: [], subjects: [], demoPrograms: [], teachingModes: [], availableDays: [], availableSlots: [],
    profilePhotoUrl: "", demoVideoUrl: "", bio: "", teachingApproach: "", idProofType: "Aadhaar", idProofUrl: "", qualificationProofUrl: "", accountHolderName: "", upiId: "",
  });
  const [profileScheduleDay, setProfileScheduleDay] = useState("Monday");

  function openProfileEditor() {
    const slots = (teacher?.availableSlots || []).map((slot) => ({ ...slot, dayOfWeek: slot.dayOfWeek || slot.day || "Monday" }));
    setProfileDraft({
      name: teacher?.name || "",
      email: teacher?.email || auth.currentUser?.email || "",
      phone: teacher?.phone || "",
      city: teacher?.city || "",
      qualification: teacher?.qualification || "",
      institution: teacher?.institution || "",
      graduationYear: teacher?.graduationYear ? String(teacher.graduationYear) : "",
      experienceYears: String(teacher?.experienceYears ?? ""),
      experienceDescription: teacher?.experienceDescription || "",
      boards: teacher?.boards || [],
      grades: teacher?.grades || teacher?.classesTaught || [],
      subjects: teacher?.subjects || [],
      demoPrograms: teacher?.demoPrograms || [],
      teachingModes: teacher?.teachingModes || [
        ...(teacher?.groupAvailable ? ["GROUP"] : []),
        ...(teacher?.individualAvailable ? ["INDIVIDUAL"] : []),
      ],
      availableDays: teacher?.availableDays || [...new Set(slots.map((slot) => slot.dayOfWeek || "Monday"))],
      availableSlots: slots,
      profilePhotoUrl: teacher?.profilePhotoUrl || "",
      demoVideoUrl: teacher?.demoVideoUrl || "",
      bio: teacher?.bio || "",
      teachingApproach: teacher?.teachingApproach || "",
      idProofType: teacher?.kyc?.idProofType || "Aadhaar",
      idProofUrl: teacher?.kyc?.idProofUrl || "",
      qualificationProofUrl: teacher?.kyc?.qualificationProofUrl || "",
      accountHolderName: teacher?.payout?.accountHolderName || "",
      upiId: teacher?.payout?.upiId || "",
    });
    setProfileScheduleDay((teacher?.availableDays || [slots[0]?.dayOfWeek || "Monday"])[0] || "Monday");
    setProfileMessage("");
    setProfileEditing(true);
  }

  function toggleProfileChoice(field: "boards" | "grades" | "subjects" | "demoPrograms" | "teachingModes" | "availableDays", value: string) {
    setProfileDraft((current) => {
      const values = current[field];
      const nextValues = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
      if (field !== "availableDays") return { ...current, [field]: nextValues };
      const removed = values.includes(value);
      return {
        ...current,
        availableDays: nextValues,
        availableSlots: removed ? current.availableSlots.filter((slot) => (slot.dayOfWeek || slot.day) !== value) : current.availableSlots,
      };
    });
  }

  function toggleProfileSlot(day: string, startTime: string, endTime: string) {
    setProfileDraft((current) => {
      const existing = current.availableSlots.some((slot) => (slot.dayOfWeek || slot.day) === day && slot.startTime === startTime);
      const availableSlots = existing
        ? current.availableSlots.filter((slot) => !((slot.dayOfWeek || slot.day) === day && slot.startTime === startTime))
        : [...current.availableSlots, { slotId: `${day.toLowerCase()}_${startTime.replace(":", "")}`, dayOfWeek: day, startTime, endTime, isOccupied: false }];
      const availableDays = availableSlots.length && !current.availableDays.includes(day) ? [...current.availableDays, day] : current.availableDays;
      return { ...current, availableSlots, availableDays };
    });
  }

  async function saveTeacherProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const user = auth.currentUser;
    if (!user || profileSaving) return;
    const experienceYears = Number(profileDraft.experienceYears || 0);
    if (!profileDraft.name.trim() || !Number.isFinite(experienceYears) || experienceYears < 0 || experienceYears > 60) {
      setProfileMessage("Enter a name and a valid experience value (0–60 years).");
      return;
    }
    if (!profileDraft.subjects.length || !profileDraft.availableDays.length || !profileDraft.availableSlots.length) {
      setProfileMessage("Choose at least one subject, available day, and time slot.");
      return;
    }
    const grades = profileDraft.grades;
    const demoPrograms = profileDraft.demoPrograms;
    const teachingModes = profileDraft.teachingModes;
    setProfileSaving(true);
    setProfileMessage("");
    try {
      const updates = {
        name: profileDraft.name.trim(), email: profileDraft.email.trim().toLowerCase(), phone: profileDraft.phone.replace(/\D/g, ""), city: profileDraft.city.trim(),
        qualification: profileDraft.qualification.trim(), institution: profileDraft.institution.trim(), graduationYear: profileDraft.graduationYear ? Number(profileDraft.graduationYear) : null,
        experienceYears, experienceDescription: profileDraft.experienceDescription.trim(),
        boards: profileDraft.boards, subjects: profileDraft.subjects, grades, classesTaught: grades,
        demoPrograms, teachingModes, availableDays: profileDraft.availableDays,
        availableSlots: profileDraft.availableSlots.map((slot) => ({ ...slot, dayOfWeek: slot.dayOfWeek || slot.day || "Monday" })),
        groupAvailable: teachingModes.includes("GROUP"), individualAvailable: teachingModes.includes("INDIVIDUAL"),
        demoVideoUrl: profileDraft.demoVideoUrl.trim(), profilePhotoUrl: profileDraft.profilePhotoUrl.trim(), bio: profileDraft.bio.trim(), teachingApproach: profileDraft.teachingApproach.trim(),
        kyc: { ...(teacher?.kyc || {}), idProofType: profileDraft.idProofType, idProofUrl: profileDraft.idProofUrl.trim(), qualificationProofUrl: profileDraft.qualificationProofUrl.trim() },
        payout: { ...(teacher?.payout || {}), accountHolderName: profileDraft.accountHolderName.trim(), upiId: profileDraft.upiId.trim() },
      };
      await updateDoc(doc(db, "teachers", user.uid), updates);
      setTeacher((current) => current ? { ...current, ...updates } : current);
      setProfileEditing(false);
      setProfileMessage("Teaching profile saved.");
    } catch (error) {
      console.error("Teacher profile update failed:", error);
      setProfileMessage("Could not save your profile. Please try again.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function startAssignedDemo(demo: DemoBooking) {
    const user = auth.currentUser;
    if (!user || !demo.batchId || startingDemoId) return;
    setStartingDemoId(demo.id);
    setDemoActionError(null);
    try {
      const response = await fetch("/api/class_sessions/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          demoBookingId: demo.id,
          batchId: demo.batchId,
          title: `Demo class · ${demo.studentName || "Student"}`,
          subject: formatSubjects(demo.subjects, demo.subject),
          durationMinutes: 60,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.session?.id) {
        throw new Error(result.message || "Could not prepare this demo classroom.");
      }
      router.push(`/studio/${encodeURIComponent(result.session.id)}`);
    } catch (error) {
      setDemoActionError({ id: demo.id, message: error instanceof Error ? error.message : "Could not prepare this demo classroom." });
      setStartingDemoId("");
    }
  }

  useEffect(() => {
    let unsubscribeSessions:
      | (() => void)
      | null = null;

    let unsubscribeDemos:
      | (() => void)
      | null = null;

    const unsubscribeAuth =
      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          router.replace("/teacher-auth");
          return;
        }

        setLoading(true);
        setError("");

        try {
          const teacherRef = doc(
            db,
            "teachers",
            user.uid,
          );

          const teacherSnap =
            await getDoc(teacherRef);

          if (!teacherSnap.exists()) {
            router.replace("/onboarding/teacher");
            return;
          }

          const teacherData =
            teacherSnap.data() as Teacher;

          setTeacher({
            ...teacherData,
            uid: user.uid,
          });

          /*
           * =================================================
           * TEACHER CLASS SESSIONS
           * =================================================
           */

          const sessionQuery = query(
            collection(db, "class_sessions"),
            where("teacherId", "==", user.uid),
          );

          unsubscribeSessions =
            onSnapshot(
              sessionQuery,
              (snapshot) => {
                const rows: Session[] =
                  snapshot.docs.map((item) => ({
                    /*
                     * IMPORTANT:
                     * spread FIRST, id LAST.
                     *
                     * Firestore document may already contain
                     * an "id" field.
                     */
                    ...(item.data() as Session),
                    id: item.id,
                  }));

                setSessions(rows);
                setLoading(false);
              },
              (listenerError) => {
                console.error(
                  "Teacher sessions listener error:",
                  listenerError,
                );

                setError(
                  "Unable to load your classes right now.",
                );

                setLoading(false);
              },
            );

          /*
           * =================================================
           * TEACHER DEMOS
           * =================================================
           */

          const demoQuery = query(
            collection(db, "demo_bookings"),
            where(
              "teacherId",
              "==",
              user.uid,
            ),
          );

          unsubscribeDemos =
            onSnapshot(
              demoQuery,
              (snapshot) => {
                const rows: DemoBooking[] =
                  snapshot.docs.map((item) => ({
                    /*
                     * IMPORTANT:
                     * spread FIRST, id LAST.
                     */
                    ...(item.data() as DemoBooking),
                    id: item.id,
                  }));

                setDemos(rows);
              },
              (listenerError) => {
                console.error(
                  "Teacher demos listener error:",
                  listenerError,
                );
              },
            );
        } catch (err) {
          console.error(
            "Teacher dashboard error:",
            err,
          );

          setError(
            "Unable to load dashboard data.",
          );

          setLoading(false);
        }
      });

    return () => {
      unsubscribeAuth();

      unsubscribeSessions?.();
      unsubscribeDemos?.();
    };
  }, [router, refreshKey]);

  const [batches, setBatches] = useState<Array<{id: string; name?: string; title?: string; subject?: string; subjects?: string[]; status?: string; type?: string; classNumber?: number; board?: string; studentIds?: string[]}>>([]);
  useEffect(() => {
    let stop: (() => void) | undefined;
    const authStop = onAuthStateChanged(auth, (user) => {
      stop?.();
      if (!user) { setBatches([]); return; }
      stop = onSnapshot(query(collection(db, "batches"), where("teacherId", "==", user.uid)), (snapshot) => setBatches(snapshot.docs.map((item) => ({...item.data(), id:item.id}))), () => setError("Unable to load your current batches. Please refresh."));
    });
    return () => { authStop(); stop?.(); };
  }, [refreshKey]);

  const now = Date.now();

  const activeSessions = useMemo(() => {
    return sessions
      .filter(
        (session) =>
          session.status !== "ENDED" &&
          session.status !== "COMPLETED" &&
          session.status !== "CANCELLED",
      )
      .sort(
        (a, b) =>
          getDateTime(
            a.date,
            a.startTime,
          ) -
          getDateTime(
            b.date,
            b.startTime,
          ),
      );
  }, [sessions]);

  const todaySessions = useMemo(() => {
    const today =
      new Date()
        .toISOString()
        .slice(0, 10);

    return activeSessions.filter(
      (session) =>
        session.date === today,
    );
  }, [activeSessions]);

  const upcomingSessions = useMemo(() => {
    return activeSessions
      .filter(
        (session) =>
          getDateTime(
            session.date,
            session.startTime,
          ) >=
          now - 60 * 60 * 1000,
      )
      .slice(0, 6);
  }, [activeSessions, now]);

  const upcomingDemos = useMemo(() => {
    return demos
      .filter(
        (demo) =>
          demo.status !== "CANCELLED" &&
          demo.status !== "COMPLETED",
      )
      .sort(
        (a, b) =>
          getDateTime(
            a.date,
            a.startTime,
          ) -
          getDateTime(
            b.date,
            b.startTime,
          ),
      )
      .slice(0, 6);
  }, [demos]);

  const liveCount = sessions.filter(
    (item) =>
      item.status === "LIVE",
  ).length;

  const uniqueStudents = useMemo(() => {
    const ids = new Set<string>();

    sessions.forEach((session) => {
      session.studentIds?.forEach((id) => {
        if (id) ids.add(id);
      });
    });

    demos.forEach((demo) => {
      if (demo.studentId) {
        ids.add(demo.studentId);
      }
    });

    return ids.size;
  }, [sessions, demos]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f8fc]">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <Loader2
              size={34}
              className="mx-auto animate-spin text-indigo-600"
            />

            <p className="mt-4 text-sm font-bold text-slate-500">
              Loading teacher dashboard...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc]">
      <div className="mx-auto w-full max-w-[1520px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">

        {/* HEADER */}
        <header className="relative isolate mb-5 overflow-hidden rounded-[26px] border border-blue-100 bg-gradient-to-r from-[#dcedff] via-[#edf5ff] to-[#f7f9ff] px-5 py-6 text-[#101a35] shadow-sm sm:px-7 sm:py-7">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[44%] md:block"><Image src="/img1.png" alt="Teacher leading a remote lesson" fill priority sizes="(max-width: 768px) 0px, 40vw" className="object-cover object-[left_8%]" /></div>
          <div className="pointer-events-none absolute inset-y-0 right-[22%] hidden w-1/3 bg-gradient-to-r from-[#edf5ff] via-[#edf5ff]/75 to-transparent md:block" />
          <div className="pointer-events-none absolute -right-12 -top-28 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="relative z-10 md:max-w-[60%]">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Teacher workspace</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Welcome back, {teacher?.name || "Teacher"}</h1>
            <p className="mt-2 text-sm text-slate-600">Your current batches and booked demos, ready to teach.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setRefreshKey(
                  (value) => value + 1,
                )
              }
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white/75 px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-white"
            >
              <RefreshCw size={15} />
              Refresh
            </button>

            <Link
              href="/teacher-settings"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-700"
            >
              Settings
            </Link>
          </div></div>
        </header>

        {error && (
          <div className="mb-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <CircleAlert
              size={18}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="text-sm font-black">
                Dashboard warning
              </p>

              <p className="mt-1 text-xs">
                {error}
              </p>
            </div>
          </div>
        )}

        <div className="mt-7 space-y-8">
          <section aria-labelledby="current-batches"><div className="mb-4 flex items-end justify-between gap-4"><div><h2 id="current-batches" className="text-xl font-extrabold tracking-tight text-slate-950">Current batches</h2><p className="mt-1 text-xs leading-5 text-slate-500">Your active teaching groups and their scheduled classrooms. Times shown in IST.</p></div></div>
            <div className="grid gap-4 xl:grid-cols-2">{batches.filter((batch) => !["ENDED","COMPLETED","CANCELLED","ARCHIVED"].includes(batch.status || "") && batch.type !== "DEMO" && !demos.some((demo) => demo.batchId === batch.id)).map((batch) => {
              const upcoming = activeSessions.filter((session) => session.batchId === batch.id && session.type !== "DEMO");
              return <article key={batch.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Users size={21}/></span><span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">{batch.status || "Active"}</span></div><h3 className="mt-4 text-lg font-extrabold tracking-tight text-slate-950">{batch.name || batch.title || formatSubjects(batch.subjects,batch.subject)}</h3><p className="mt-1 text-xs text-slate-500">{formatSubjects(batch.subjects,batch.subject)}{batch.classNumber ? " / Class " + batch.classNumber : ""}{batch.board ? " / " + batch.board : ""}</p><p className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-600"><Users size={14}/>{batch.studentIds?.length ?? 0} enrolled students</p></div><div className="border-t border-slate-100 px-5 sm:px-6">{upcoming.length ? upcoming.map((session) => <div key={session.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 py-4 last:border-0"><div><p className="text-sm font-bold text-slate-800">{session.title || session.subject || "Live class"}</p><p className="mt-1 text-xs text-slate-500">{formatDate(session.date)} / {session.startTime || "Time pending"}{session.endTime ? " - " + session.endTime : ""} IST</p><p className="mt-1 text-[10px] font-semibold text-indigo-600">{statusLabel(session.status)}</p></div><Link href={"/studio/"+encodeURIComponent(session.id)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"><Play size={14}/>{session.status === "LIVE" ? "Join live class" : "Open classroom"}</Link></div>) : <div className="py-5"><p className="text-xs text-slate-500">No classroom scheduled yet.</p><button disabled className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-xs font-bold text-slate-400"><Play size={14}/>Join unavailable</button></div>}</div></article>;
            })}</div>
            {!batches.some((batch) => !["ENDED","COMPLETED","CANCELLED","ARCHIVED"].includes(batch.status || "") && batch.type !== "DEMO" && !demos.some((demo) => demo.batchId === batch.id)) && <EmptyState title="No current batches" description="Your assigned teaching batches and classroom links will appear here."/>}
          </section>
          <section aria-labelledby="booked-demos"><div className="mb-4"><h2 id="booked-demos" className="text-xl font-extrabold tracking-tight text-slate-950">Booked demos</h2><p className="mt-1 text-xs leading-5 text-slate-500">Student bookings with every linked demo session and classroom action.</p></div><div className="grid gap-4 xl:grid-cols-2">
            {demos.filter((demo) => demo.status !== "CANCELLED" && demo.demoStatus !== "COMPLETED" && demo.status !== "COMPLETED").map((demo) => {
              const ids = new Set([...(demo.sessionIds || demo.demoSessionIds || []), ...(demo.sessionId ? [demo.sessionId] : [])]);
              const linked = sessions.filter((session) => ids.has(session.id) || (demo.batchId && (session.batchId === demo.batchId || session.demoBatchId === demo.batchId))).sort((a,b) => getDateTime(a.date,a.startTime)-getDateTime(b.date,b.startTime));
              return <article key={demo.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between gap-3"><span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-[10px] font-bold text-indigo-700">Booked demo</span><span className="text-[10px] text-slate-400">#{demo.id.slice(-7).toUpperCase()}</span></div><h3 className="mt-4 text-lg font-extrabold text-slate-950">{formatSubjects(demo.subjects,demo.subject)}</h3><div className="mt-4 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-slate-500"><UserRound size={19}/></span><div><p className="text-sm font-bold text-slate-800">{demo.studentName || "Assigned student"}</p><p className="mt-1 text-xs text-slate-500">{demo.classNumber ? "Class " + demo.classNumber + " / " : ""}{demo.board || "Board pending"} / {demo.demoType === "INDIVIDUAL" ? "One-to-one" : "Small group"}</p></div></div><div className="mt-5 border-t border-slate-100">{linked.map((session,index) => <div key={session.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 py-4 last:border-0"><div><p className="text-xs font-bold text-slate-800">Day {index+1} / {formatDate(session.date)}</p><p className="mt-1 text-xs text-slate-500">{session.startTime || "Time pending"}{session.endTime ? " - " + session.endTime : ""} IST</p><p className="mt-1 text-[10px] text-slate-500">{statusLabel(session.status)}</p></div>{["ENDED","COMPLETED","CANCELLED","PROCESSING"].includes(session.status || "") ? <button disabled className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-xs font-bold text-slate-400"><Play size={14}/>{statusLabel(session.status)}</button> : <Link href={"/studio/"+encodeURIComponent(session.id)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white hover:bg-indigo-700"><Play size={14}/>{session.status === "LIVE" ? "Join live demo" : "Open demo classroom"}</Link>}</div>)}</div>{!linked.length && <div className="mt-4"><p className="text-xs text-slate-500">{formatDate(demo.date)} / {demo.startTime || "Time pending"} IST</p><button type="button" onClick={() => void startAssignedDemo(demo)} disabled={!demo.batchId || Boolean(startingDemoId)} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{startingDemoId === demo.id ? <Loader2 size={14} className="animate-spin"/> : <Play size={14}/>} {startingDemoId === demo.id ? "Preparing..." : "Prepare & open demo"}</button></div>}{demoActionError?.id === demo.id && <p role="alert" className="mt-3 text-xs text-rose-600">{demoActionError.message}</p>}</article>;
            })}</div>{!demos.some((demo) => demo.status !== "CANCELLED" && demo.demoStatus !== "COMPLETED" && demo.status !== "COMPLETED") && <EmptyState title="No booked demos" description="New demo bookings assigned to you will appear here."/>}
          </section>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: number | string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500">
          {label}
        </span>

        <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600 transition group-hover:bg-indigo-100">
          {icon}
        </span>
      </div>

      <p className="mt-3 text-2xl font-black text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-slate-400">
        {description}
      </p>
    </div>
  );
}

function ProfileBox({
  label,
  value,
  verified,
}: {
  label: string;
  value: string;
  verified?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-2 flex items-center gap-1.5 text-sm font-black text-slate-800">
        {verified && (
          <CheckCircle2
            size={15}
            className="text-emerald-600"
          />
        )}

        {value}
      </p>
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200"
    >
      <div className="flex items-center justify-between">
        {icon}

        <ArrowRight
          size={17}
          className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-600"
        />
      </div>

      <h3 className="mt-4 text-sm font-black text-slate-900">
        {title}
      </h3>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </Link>
  );
}
