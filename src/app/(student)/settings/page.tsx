"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase/client";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronRight,
  Loader2,
  LogOut,
  Mail,
  ShieldCheck,
  UserRound,
  Video,
} from "lucide-react";
import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

export default function StudentSettingsPage() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const [classReminders, setClassReminders] = useState(true);
  const [homeworkNotifications, setHomeworkNotifications] =
    useState(true);
  const [teacherMessages, setTeacherMessages] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      setUid(user.uid);
      setEmail(user.email || "");
      setName(user.displayName || "");

      try {
        const snap = await getDoc(doc(db, "students", user.uid));

        if (snap.exists()) {
          const data = snap.data();

          setName(
            data.name ||
              user.displayName ||
              ""
          );

          setClassReminders(
            data.notificationPreferences?.classReminders ??
              true
          );

          setHomeworkNotifications(
            data.notificationPreferences
              ?.homeworkNotifications ?? true
          );

          setTeacherMessages(
            data.notificationPreferences
              ?.teacherMessages ?? true
          );
        }
      } catch (err) {
        console.error("Settings load error:", err);
        setError("Unable to load your settings.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const saveSettings = async () => {
    if (!uid) return;

    setSaving(true);
    setSaved(false);
    setError("");

    try {
      await setDoc(
        doc(db, "students", uid),
        {
          notificationPreferences: {
            classReminders,
            homeworkNotifications,
            teacherMessages,
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await setDoc(
        doc(db, "users", uid),
        {
          notificationPreferences: {
            classReminders,
            homeworkNotifications,
            teacherMessages,
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch (err) {
      console.error("Settings save error:", err);
      setError("Unable to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await signOut(auth);

      document.cookie =
        "__session=; path=/; max-age=0";
      document.cookie =
        "user_role=; path=/; max-age=0";

      router.replace("/student-auth");
    } catch (err) {
      console.error("Logout error:", err);
      setError("Unable to logout. Please try again.");
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080D1D] flex items-center justify-center">
        <Loader2
          size={30}
          className="animate-spin text-blue-500"
        />
      </div>
    );
  }

  if (!uid) {
    return (
      <div className="min-h-screen bg-[#080D1D] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center">
          <ShieldCheck
            size={42}
            className="mx-auto text-blue-600"
          />

          <h1 className="mt-4 text-xl font-black text-slate-900">
            Login required
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Please login to access your settings.
          </p>

          <Link
            href="/student-auth"
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080D1D] text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080D1D]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link
            href="/hub"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
          >
            <ArrowLeft size={18} />
          </Link>

          <div>
            <h1 className="text-sm font-black text-white">
              Settings
            </h1>

            <p className="hidden text-[11px] text-slate-500 sm:block">
              Manage your student account
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {saved && (
          <div className="mb-5 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-400">
            <CheckCircle2 size={17} />
            Settings saved successfully.
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Account */}
          <section className="overflow-hidden rounded-[26px] border border-white/10 bg-white">
            <div className="border-b border-slate-100 p-6">
              <h2 className="text-lg font-black text-slate-950">
                Account
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Your basic account information.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              <div className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <UserRound size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-500">
                    Name
                  </p>

                  <p className="mt-1 truncate text-sm font-black text-slate-900">
                    {name || "Student"}
                  </p>
                </div>

                <Link
                  href="/profile"
                  className="flex items-center gap-1 text-xs font-bold text-blue-600"
                >
                  Edit
                  <ChevronRight size={14} />
                </Link>
              </div>

              <div className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Mail size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-500">
                    Email
                  </p>

                  <p className="mt-1 truncate text-sm font-black text-slate-900">
                    {email || "Not available"}
                  </p>
                </div>

                <span className="text-[10px] font-bold text-slate-400">
                  Managed by Firebase
                </span>
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section className="overflow-hidden rounded-[26px] border border-white/10 bg-white">
            <div className="border-b border-slate-100 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Bell size={19} />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    Notifications
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Preferences are saved to your profile. Push, email and WhatsApp delivery are not configured yet.
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              <SettingToggle
                title="Class reminders"
                description="Preference saved; reminders are not sent yet."
                enabled={classReminders}
                onChange={setClassReminders}
              />

              <SettingToggle
                title="Homework updates"
                description="Preference saved; homework notifications are not sent yet."
                enabled={homeworkNotifications}
                onChange={setHomeworkNotifications}
              />

              <SettingToggle
                title="Teacher messages"
                description="Preference saved; message notifications are not sent yet."
                enabled={teacherMessages}
                onChange={setTeacherMessages}
              />
            </div>

            <div className="border-t border-slate-100 p-5">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-black text-white transition hover:bg-blue-500 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <CheckCircle2 size={17} />
                )}

                {saving
                  ? "Saving..."
                  : "Save Notification Settings"}
              </button>
            </div>
          </section>

          {/* Learning */}
          <section className="overflow-hidden rounded-[26px] border border-white/10 bg-white">
            <div className="border-b border-slate-100 p-6">
              <h2 className="text-lg font-black text-slate-950">
                Learning
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Manage your learning profile and classes.
              </p>
            </div>

            <Link
              href="/profile"
              className="flex items-center gap-4 p-5 transition hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Video size={19} />
              </div>

              <div className="flex-1">
                <p className="text-sm font-black text-slate-900">
                  Learning profile
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Class, board, subjects and learning preferences.
                </p>
              </div>

              <ChevronRight
                size={18}
                className="text-slate-400"
              />
            </Link>
          </section>

          {/* Security */}
          <section className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <ShieldCheck size={19} />
              </div>

              <div>
                <h3 className="text-sm font-black text-white">
                  Account Security
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Your authentication is handled by Firebase
                  Authentication. Sensitive authentication credentials
                  are not stored in your student profile.
                </p>
              </div>
            </div>
          </section>

          {/* Logout */}
          <section className="rounded-[26px] border border-red-500/10 bg-red-500/[0.04] p-5">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 py-3 text-sm font-black text-red-400 transition hover:bg-red-500/15 disabled:opacity-60"
            >
              {loggingOut ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <LogOut size={17} />
              )}

              {loggingOut
                ? "Logging out..."
                : "Logout"}
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}

function SettingToggle({
  title,
  description,
  enabled,
  onChange,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 p-5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-slate-900">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          enabled
            ? "bg-blue-600"
            : "bg-slate-200"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
            enabled
              ? "left-6"
              : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
