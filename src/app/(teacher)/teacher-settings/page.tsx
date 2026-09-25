"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  LogOut,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
  Loader2,
  Clock3,
  BookOpen,
} from "lucide-react";

import { auth, db } from "@/lib/firebase/client";

type NotificationPreferences = {
  classReminders: boolean;
  studentMessages: boolean;
  payoutUpdates: boolean;
};

type TeacherProfile = {
  name?: string;
  email?: string;
  phone?: string;
  notificationPreferences?: Partial<NotificationPreferences>;
  subjects?: string[];
  boards?: string[];
  classesTaught?: string[];
  grades?: string[];
  availableDays?: string[];
  availableSlots?: { slotId?: string; id?: string; dayOfWeek?: string; day?: string; startTime: string; endTime: string; isOccupied?: boolean }[];
};

const SUBJECT_OPTIONS = ["Math", "Science", "English"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SLOTS = [["15:00", "16:00"], ["16:00", "17:00"], ["17:00", "18:00"], ["18:00", "19:00"], ["19:00", "20:00"], ["20:00", "21:00"]];

const DEFAULT_PREFERENCES: NotificationPreferences = {
  classReminders: true,
  studentMessages: true,
  payoutUpdates: true,
};

export default function TeacherSettingsPage() {
  const [uid, setUid] =
    useState<string | null>(null);

  const [teacher, setTeacher] =
    useState<TeacherProfile | null>(null);

  const [preferences, setPreferences] =
    useState<NotificationPreferences>(
      DEFAULT_PREFERENCES
    );
  const [subjects, setSubjects] = useState<string[]>([]);
  const [days, setDays] = useState<string[]>([]);
  const [slots, setSlots] = useState<TeacherProfile["availableSlots"]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
          if (!user) {
            setLoading(false);
            return;
          }

          setUid(user.uid);
          await loadSettings(user.uid);
        }
      );

    return () => unsubscribe();
  }, []);

  async function loadSettings(
    teacherUid: string
  ) {
    try {
      setLoading(true);
      setError("");

      const teacherSnap =
        await getDoc(
          doc(
            db,
            "teachers",
            teacherUid
          )
        );

      if (!teacherSnap.exists()) {
        throw new Error(
          "Teacher profile not found."
        );
      }

      const data =
        teacherSnap.data() as TeacherProfile;

      setTeacher(data);
      setSubjects(Array.isArray(data.subjects) ? data.subjects : []);
      setDays(Array.isArray(data.availableDays) ? data.availableDays : []);
      setSlots(Array.isArray(data.availableSlots) ? data.availableSlots.map((slot) => ({ ...slot, dayOfWeek: slot.dayOfWeek || slot.day || "Monday", slotId: slot.slotId || slot.id })) : []);

      const stored =
        data.notificationPreferences;

      setPreferences({
        classReminders:
          stored?.classReminders ??
          DEFAULT_PREFERENCES.classReminders,

        studentMessages:
          stored?.studentMessages ??
          DEFAULT_PREFERENCES.studentMessages,

        payoutUpdates:
          stored?.payoutUpdates ??
          DEFAULT_PREFERENCES.payoutUpdates,
      });
    } catch (err) {
      console.error(
        "Teacher settings error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load settings."
      );
    } finally {
      setLoading(false);
    }
  }

  async function savePreferences() {
    if (!uid) return;

    try {
      setSaving(true);
      setSaved(false);
      setError("");

      await updateDoc(
        doc(db, "teachers", uid),
        {
          notificationPreferences:
            preferences,
        }
      );

      setSaved(true);

      window.setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch (err) {
      console.error(
        "Save teacher settings error:",
        err
      );

      setError(
        "Unable to save notification settings."
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveTeachingProfile() {
    if (!uid) return;
    if (!subjects.length || !days.length || !slots?.length) {
      setError("Choose at least one subject, available day, and time slot.");
      return;
    }
    setSaving(true); setSaved(false); setError("");
    try {
      await updateDoc(doc(db, "teachers", uid), {
        subjects,
        availableDays: days,
        availableSlots: slots,
        updatedAt: new Date(),
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("Save teaching profile error:", err);
      setError("Unable to save subjects and availability. Please try again.");
    } finally { setSaving(false); }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      window.location.href =
        "/teacher-auth";
    } catch (err) {
      console.error(
        "Teacher logout error:",
        err
      );

      setError(
        "Unable to logout. Please try again."
      );
    }
  }

  function updatePreference(
    key: keyof NotificationPreferences
  ) {
    setPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  if (loading) {
    return (
      <PageState>
        <Loader2
          size={30}
          className="animate-spin text-blue-600"
        />

        <p className="mt-3 text-sm text-slate-500">
          Loading settings...
        </p>
      </PageState>
    );
  }

  if (!uid) {
    return (
      <PageState>
        <UserRound
          size={40}
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

  const displayName =
    teacher?.name ||
    auth.currentUser?.displayName ||
    "Teacher";

  const email =
    teacher?.email ||
    auth.currentUser?.email ||
    "Not available";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-4 sm:px-6">
          <Link
            href="/dashboard"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft size={17} />
          </Link>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
              Teacher Portal
            </p>

            <h1 className="text-lg font-black text-slate-950">
              Settings
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-7 sm:px-6">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Account */}
        <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UserRound size={19} />
            </div>

            <div>
              <h2 className="text-base font-black text-slate-950">
                Account
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Your teacher account information.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <InfoCard
              icon={<UserRound size={15} />}
              label="Name"
              value={displayName}
            />

            <InfoCard
              icon={<Mail size={15} />}
              label="Email"
              value={email}
            />

            <InfoCard
              icon={<ShieldCheck size={15} />}
              label="Account Role"
              value="Teacher"
            />

            <InfoCard
              icon={<ShieldCheck size={15} />}
              label="Authentication"
              value={
                auth.currentUser
                  ?.providerData?.[0]
                  ?.providerId ===
                "google.com"
                  ? "Google"
                  : "Email"
              }
            />
          </div>
        </section>

        {/* Teaching profile: these fields drive future batch and demo matching. */}
        <section className="mt-6 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><BookOpen size={19} /></div>
            <div><h2 className="text-base font-black text-slate-950">Subjects & availability</h2><p className="mt-1 text-xs text-slate-500">Edit the subjects and recurring time slots students can request.</p></div>
          </div>
          <div className="mt-5">
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Subjects</p>
            <div className="flex flex-wrap gap-2">{SUBJECT_OPTIONS.map((subject) => {
              const selected = subjects.includes(subject);
              return <button key={subject} type="button" onClick={() => setSubjects((current) => selected ? current.filter((item) => item !== subject) : [...current, subject])} className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${selected ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{subject}</button>;
            })}</div>
          </div>
          <div className="mt-6">
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Available days</p>
            <div className="flex flex-wrap gap-2">{DAYS.map((day) => {
              const selected = days.includes(day);
              return <button key={day} type="button" onClick={() => { setDays((current) => selected ? current.filter((item) => item !== day) : [...current, day]); if (selected) setSlots((current) => (current || []).filter((slot) => (slot.dayOfWeek || slot.day) !== day)); }} className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${selected ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{day}</button>;
            })}</div>
          </div>
          <div className="mt-6">
            <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500"><Clock3 size={14}/> Time slots</p>
            <div className="space-y-3">{days.map((day) => <div key={day} className="rounded-2xl bg-slate-50 p-4"><p className="mb-3 text-sm font-bold text-slate-800">{day}</p><div className="flex flex-wrap gap-2">{SLOTS.map(([startTime, endTime]) => {
              const exists = slots?.some((slot) => (slot.dayOfWeek || slot.day) === day && slot.startTime === startTime);
              const slotId = `${startTime.slice(0, 2)}_${endTime.slice(0, 2)}`;
              return <button key={slotId} type="button" onClick={() => setSlots((current) => exists ? (current || []).filter((slot) => !((slot.dayOfWeek || slot.day) === day && slot.startTime === startTime)) : [...(current || []), { slotId, dayOfWeek: day, startTime, endTime, isOccupied: false }])} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${exists ? "border-blue-600 bg-white text-blue-700" : "border-slate-200 bg-white text-slate-500 hover:border-blue-300"}`}>{formatClock(startTime)}–{formatClock(endTime)}</button>;
            })}</div></div>)}</div>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">Changes apply to future demo and batch availability. Existing scheduled classes keep their current time.</p>
          <div className="mt-5 flex justify-end"><button type="button" onClick={saveTeachingProfile} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-black text-white hover:bg-blue-500 disabled:opacity-50">{saving ? <Loader2 size={15} className="animate-spin"/> : saved ? <Check size={15}/> : <Save size={15}/>} {saved ? "Saved" : "Save teaching profile"}</button></div>
        </section>

        {/* Notifications */}
        <section className="mt-6 rounded-[26px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Bell size={19} />
              </div>

              <div>
                <h2 className="text-base font-black text-slate-950">
                  Notifications
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Preferences are saved to your profile. Email, push and WhatsApp delivery are not configured yet.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            <NotificationRow
              title="Class reminders"
              description="Get reminders for upcoming classes."
              enabled={
                preferences.classReminders
              }
              onClick={() =>
                updatePreference(
                  "classReminders"
                )
              }
            />

            <NotificationRow
              title="Student messages"
              description="Get notified about student or parent messages."
              enabled={
                preferences.studentMessages
              }
              onClick={() =>
                updatePreference(
                  "studentMessages"
                )
              }
            />

            <NotificationRow
              title="Payout updates"
              description="Get notified when payout status changes."
              enabled={
                preferences.payoutUpdates
              }
              onClick={() =>
                updatePreference(
                  "payoutUpdates"
                )
              }
            />
          </div>

          <div className="flex justify-end border-t border-slate-100 p-5 sm:p-6">
            <button
              type="button"
              onClick={savePreferences}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              ) : saved ? (
                <Check size={15} />
              ) : (
                <Save size={15} />
              )}

              {saved
                ? "Saved"
                : "Save Settings"}
            </button>
          </div>
        </section>

        {/* Profile / verification */}
        <section className="mt-6 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
          <Link
            href="/accreditation"
            className="flex items-center justify-between p-5 transition hover:bg-slate-50 sm:p-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <ShieldCheck size={19} />
              </div>

              <div>
                <h2 className="text-sm font-black text-slate-950">
                  Profile & Verification
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  View education, subjects, availability and KYC status.
                </p>
              </div>
            </div>

            <ChevronRight
              size={18}
              className="text-slate-400"
            />
          </Link>
        </section>

        {/* Security */}
        <section className="mt-6 rounded-[26px] border border-slate-200 bg-white shadow-sm">
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <ShieldCheck size={19} />
              </div>

              <div>
                <h2 className="text-base font-black text-slate-950">
                  Security
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Your authentication is managed through Firebase Auth.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Signed-in account
              </p>

              <p className="mt-1 break-all text-sm font-bold text-slate-700">
                {email}
              </p>
            </div>
          </div>
        </section>

        {/* Logout */}
        <section className="mt-6 rounded-[26px] border border-red-100 bg-white p-5 shadow-sm">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-between rounded-2xl p-2 text-left transition hover:bg-red-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <LogOut size={18} />
              </div>

              <div>
                <p className="text-sm font-black text-red-700">
                  Logout
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Sign out from the teacher portal.
                </p>
              </div>
            </div>

            <ChevronRight
              size={18}
              className="text-red-300"
            />
          </button>
        </section>
      </main>
    </div>
  );
}

function formatClock(value: string) {
  const [hourText, minute] = value.split(":");
  const hour = Number(hourText);
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}

        <span className="text-[10px] font-black uppercase tracking-wider">
          {label}
        </span>
      </div>

      <p className="mt-2 break-words text-sm font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function NotificationRow({
  title,
  description,
  enabled,
  onClick,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-slate-50 sm:p-6"
    >
      <div>
        <p className="text-sm font-black text-slate-800">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>

      <div
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          enabled
            ? "bg-blue-600"
            : "bg-slate-200"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
            enabled
              ? "left-6"
              : "left-1"
          }`}
        />
      </div>
    </button>
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
