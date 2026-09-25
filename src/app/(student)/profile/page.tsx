"use client";

import React, { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/client";
import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import {
  ArrowLeft,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Mail,
  Pencil,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import Link from "next/link";

type StudentProfile = {
  name: string;
  email: string;
  grade: string;
  board: string;
  subjects: string[];
  learningPreference: string;
};

const SUBJECTS = ["Math", "Science", "English"];

const BOARDS = [
  "CBSE",
  "ICSE",
  "UP Board",
  "State Board",
];

const GRADES = Array.from({ length: 10 }, (_, i) => `Class ${i + 1}`);

export default function StudentProfilePage() {
  const [uid, setUid] = useState<string | null>(null);

  const [profile, setProfile] = useState<StudentProfile>({
    name: "",
    email: "",
    grade: "",
    board: "",
    subjects: [],
    learningPreference: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      setUid(user.uid);

      try {
        const [userSnap, studentSnap] = await Promise.all([
          getDoc(doc(db, "users", user.uid)),
          getDoc(doc(db, "students", user.uid)),
        ]);

        const userData = userSnap.exists() ? userSnap.data() : {};
        const studentData = studentSnap.exists()
          ? studentSnap.data()
          : {};

        setProfile({
          name:
            studentData.name ||
            userData.name ||
            user.displayName ||
            "",
          email:
            studentData.email ||
            userData.email ||
            user.email ||
            "",
          grade:
            studentData.grade ||
            studentData.class ||
            userData.grade ||
            userData.class ||
            "",
          board:
            studentData.board ||
            userData.board ||
            "",
          subjects:
            Array.isArray(studentData.subjects)
              ? studentData.subjects
              : Array.isArray(userData.subjects)
              ? userData.subjects
              : [],
          learningPreference:
            studentData.learningPreference ||
            userData.learningPreference ||
            "",
        });
      } catch (err) {
        console.error("Student profile error:", err);
        setError("Unable to load your profile.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const toggleSubject = (subject: string) => {
    setProfile((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter((item) => item !== subject)
        : [...prev.subjects, subject],
    }));
  };

  const handleSave = async () => {
    if (!uid) return;

    setError("");
    setMessage("");

    if (!profile.name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!profile.grade) {
      setError("Please select your class.");
      return;
    }

    if (!profile.board) {
      setError("Please select your board.");
      return;
    }

    if (profile.subjects.length === 0) {
      setError("Please select at least one subject.");
      return;
    }

    setSaving(true);

    try {
      const cleanProfile = {
        name: profile.name.trim(),
        email: profile.email,
        grade: profile.grade,
        board: profile.board,
        subjects: profile.subjects,
        learningPreference:
          profile.learningPreference.trim(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(
        doc(db, "students", uid),
        {
          uid,
          ...cleanProfile,
        },
        { merge: true }
      );

      await setDoc(
        doc(db, "users", uid),
        {
          uid,
          name: profile.name.trim(),
          email: profile.email,
          role: "STUDENT",
          grade: profile.grade,
          board: profile.board,
          subjects: profile.subjects,
          learningPreference:
            profile.learningPreference.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: profile.name.trim(),
        });
      }

      setEditing(false);
      setMessage("Profile updated successfully.");

      setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (err) {
      console.error("Profile save error:", err);
      setError(
        "Unable to save your profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = async () => {
    if (!uid) return;

    setError("");
    setMessage("");

    try {
      const [userSnap, studentSnap] = await Promise.all([
        getDoc(doc(db, "users", uid)),
        getDoc(doc(db, "students", uid)),
      ]);

      const userData = userSnap.exists() ? userSnap.data() : {};
      const studentData = studentSnap.exists()
        ? studentSnap.data()
        : {};

      setProfile({
        name:
          studentData.name ||
          userData.name ||
          auth.currentUser?.displayName ||
          "",
        email:
          studentData.email ||
          userData.email ||
          auth.currentUser?.email ||
          "",
        grade:
          studentData.grade ||
          studentData.class ||
          userData.grade ||
          userData.class ||
          "",
        board:
          studentData.board ||
          userData.board ||
          "",
        subjects:
          Array.isArray(studentData.subjects)
            ? studentData.subjects
            : Array.isArray(userData.subjects)
            ? userData.subjects
            : [],
        learningPreference:
          studentData.learningPreference ||
          userData.learningPreference ||
          "",
      });

      setEditing(false);
    } catch (err) {
      console.error(err);
      setEditing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080D1D] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            size={30}
            className="animate-spin text-blue-500"
          />
          <p className="text-sm text-slate-400">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  if (!uid) {
    return (
      <div className="min-h-screen bg-[#080D1D] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl bg-white p-8 text-center">
          <ShieldCheck
            size={42}
            className="mx-auto text-blue-600"
          />

          <h1 className="mt-4 text-xl font-black text-slate-900">
            Login required
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Please login to access your student profile.
          </p>

          <Link
            href="/student-auth"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white"
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
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/hub"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
            >
              <ArrowLeft size={18} />
            </Link>

            <div>
              <p className="text-sm font-black text-white">
                My Profile
              </p>
              <p className="hidden text-[11px] text-slate-500 sm:block">
                Manage your learning information
              </p>
            </div>
          </div>

          {!editing ? (
            <button
              onClick={() => {
                setError("");
                setMessage("");
                setEditing(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-500"
            >
              <Pencil size={15} />
              Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={cancelEditing}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-slate-300"
              >
                <X size={15} />
                Cancel
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-60"
              >
                {saving ? (
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                ) : (
                  <Save size={15} />
                )}

                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Alerts */}
        {message && (
          <div className="mb-5 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-400">
            <CheckCircle2 size={17} />
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Profile summary */}
          <aside className="h-fit rounded-[26px] border border-white/10 bg-white/[0.04] p-6">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-blue-600 text-3xl font-black text-white shadow-xl shadow-blue-900/30">
                {profile.name
                  ? profile.name
                      .trim()
                      .slice(0, 2)
                      .toUpperCase()
                  : "ST"}
              </div>

              <h2 className="mt-4 text-lg font-black text-white">
                {profile.name || "Student"}
              </h2>

              <p className="mt-1 break-all text-xs text-slate-500">
                {profile.email || "Email not available"}
              </p>

              {profile.grade && (
                <div className="mt-4 flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-400">
                  <GraduationCap size={14} />
                  {profile.grade}
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                Account
              </p>

              <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5">
                  <ShieldCheck size={15} />
                </div>
                Student account
              </div>
            </div>
          </aside>

          {/* Main profile */}
          <section className="space-y-6">
            {/* Personal Information */}
            <div className="rounded-[26px] border border-white/10 bg-white p-5 shadow-2xl sm:p-7">
              <div className="mb-6">
                <h2 className="text-lg font-black text-slate-950">
                  Personal Information
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Keep your basic account information up to date.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Full Name">
                  <input
                    value={profile.name}
                    disabled={!editing}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        name: e.target.value,
                      }))
                    }
                    className={inputClass(!editing)}
                    placeholder="Your full name"
                  />
                </Field>

                <Field label="Email">
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      value={profile.email}
                      disabled
                      className={`${inputClass(
                        true
                      )} pl-10`}
                    />
                  </div>
                </Field>
              </div>
            </div>

            {/* Learning Profile */}
            <div className="rounded-[26px] border border-white/10 bg-white p-5 shadow-2xl sm:p-7">
              <div className="mb-6">
                <h2 className="text-lg font-black text-slate-950">
                  Learning Profile
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  This information helps BlankLearn personalize
                  your learning experience.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Class">
                  <select
                    value={profile.grade}
                    disabled={!editing}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        grade: e.target.value,
                      }))
                    }
                    className={inputClass(!editing)}
                  >
                    <option value="">Select class</option>

                    {GRADES.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Board">
                  <select
                    value={profile.board}
                    disabled={!editing}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        board: e.target.value,
                      }))
                    }
                    className={inputClass(!editing)}
                  >
                    <option value="">Select board</option>

                    {BOARDS.map((board) => (
                      <option key={board} value={board}>
                        {board}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Subjects */}
              <div className="mt-6">
                <label className="mb-3 block text-xs font-black text-slate-800">
                  Subjects
                </label>

                <div className="flex flex-wrap gap-2">
                  {SUBJECTS.map((subject) => {
                    const selected =
                      profile.subjects.includes(subject);

                    return (
                      <button
                        key={subject}
                        type="button"
                        disabled={!editing}
                        onClick={() =>
                          toggleSubject(subject)
                        }
                        className={`rounded-xl border px-4 py-2.5 text-xs font-bold transition ${
                          selected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        } ${
                          !editing
                            ? "cursor-default opacity-80"
                            : "hover:border-blue-400"
                        }`}
                      >
                        {subject}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Learning preference */}
              <div className="mt-6">
                <Field label="Learning Preference">
                  <textarea
                    value={profile.learningPreference}
                    disabled={!editing}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        learningPreference:
                          e.target.value,
                      }))
                    }
                    rows={4}
                    className={`${inputClass(
                      !editing
                    )} resize-none py-3`}
                    placeholder="Example: I understand concepts better with practical examples and regular practice questions."
                  />
                </Field>
              </div>
            </div>

            {/* Account security */}
            <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5 sm:p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  <ShieldCheck size={20} />
                </div>

                <div>
                  <h3 className="text-sm font-black text-white">
                    Account Security
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Your student account is authenticated through
                    Firebase Authentication. Your email cannot be
                    changed from this profile page.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black text-slate-800">
        {label}
      </label>
      {children}
    </div>
  );
}

function inputClass(disabled: boolean) {
  return `h-11 w-full rounded-xl border px-3 text-sm font-medium outline-none transition ${
    disabled
      ? "cursor-default border-slate-200 bg-slate-50 text-slate-600"
      : "border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
  }`;
}