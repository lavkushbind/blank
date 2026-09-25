"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Save,
  Users,
} from "lucide-react";

import { auth, db } from "@/lib/firebase/client";

type Session = {
  id: string;
  batchId: string;
  teacherId: string;
  title: string;
  subject: string;
  status: string;
  studentIds: string[];
  scheduledAt: any;
  generatedNotes?: string;
};

type Student = {
  id: string;
  name: string;
  present: boolean;
};

type AttendanceMap = Record<string, boolean>;

async function readApiResponse(response: Response) {
  const raw = await response.text();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(`Post-class service returned an unexpected response (HTTP ${response.status}). Please retry or contact support.`);
  }
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error("Post-class service returned invalid data. Please retry.");
  }
}

export default function TeacherPostClassPage() {
  const params = useParams();
  const router = useRouter();

  const sessionId = String(
    params.sessionId || ""
  );

  const [session, setSession] =
    useState<Session | null>(null);

  const [students, setStudents] =
    useState<Student[]>([]);

  const [summary, setSummary] =
    useState("");

  const [notes, setNotes] =
    useState("");

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
            setError(
              "Teacher login is required."
            );
            setLoading(false);
            return;
          }

          if (!sessionId) {
            setError(
              "Invalid class session."
            );
            setLoading(false);
            return;
          }

          await loadSession(
            user.uid,
            sessionId
          );
        }
      );

    return () => unsubscribe();
  }, [sessionId]);

  async function loadSession(
    teacherUid: string,
    id: string
  ) {
    try {
      setLoading(true);
      setError("");

      const sessionSnap = await getDoc(
        doc(db, "class_sessions", id)
      );

      if (!sessionSnap.exists()) {
        throw new Error(
          "Class session not found."
        );
      }

      const data =
        sessionSnap.data();

      if (
        data.teacherId &&
        data.teacherId !== teacherUid
      ) {
        throw new Error(
          "You are not assigned to this class."
        );
      }

      const studentIds =
        Array.isArray(data.studentIds)
          ? data.studentIds.filter(
              (value: unknown): value is string =>
                typeof value === "string"
            )
          : [];

      const sessionData: Session = {
        id: sessionSnap.id,
        batchId:
          data.batchId || "",
        teacherId:
          data.teacherId || teacherUid,
        title:
          data.title || "Live Class",
        subject:
          data.subject || "General",
        status:
          data.status || "UNKNOWN",
        studentIds,
        scheduledAt:
          data.scheduledAt || null,
        generatedNotes:
          typeof data.generatedNotes === "string" ? data.generatedNotes : "",
      };

      setSession(sessionData);
      if (sessionData.generatedNotes) setSummary(sessionData.generatedNotes);

      await loadStudents(studentIds);
    } catch (err) {
      console.error(
        "Post class loading error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load class."
      );
    } finally {
      setLoading(false);
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
          doc(
            db,
            "students",
            studentId
          )
        );

        const data =
          studentSnap.exists()
            ? studentSnap.data()
            : {};

        result.push({
          id: studentId,
          name:
            data.name ||
            data.displayName ||
            "Student",
          present: true,
        });
      } catch (error) {
        console.error(
          `Unable to load student ${studentId}`,
          error
        );

        result.push({
          id: studentId,
          name: "Student",
          present: true,
        });
      }
    }

    setStudents(result);
  }

  function toggleAttendance(
    studentId: string
  ) {
    setStudents((current) =>
      current.map((student) =>
        student.id === studentId
          ? {
              ...student,
              present: !student.present,
            }
          : student
      )
    );
  }

  async function handleSubmit() {
    const user = auth.currentUser;

    if (!user) {
      setError(
        "Teacher login is required."
      );
      return;
    }

    if (!session) {
      setError(
        "Class session is unavailable."
      );
      return;
    }

    if (!summary.trim()) {
      setError(
        "Please add a short class summary."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const idToken =
        await user.getIdToken();

      const attendance: AttendanceMap = {};

      students.forEach((student) => {
        attendance[student.id] =
          student.present;
      });

      /*
       * Attendance/post-class data is sent
       * through the backend so teacher writes
       * are authenticated server-side.
       */
      const response = await fetch(
        `/api/class_sessions/${encodeURIComponent(
          session.id
        )}/post-class`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            attendance,
            summary: summary.trim(),
            notes: notes.trim(),
          }),
        }
      );

      const data = await readApiResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to submit class details."
        );
      }

      setSaved(true);

      setTimeout(() => {
        router.push("/dashboard");
      }, 900);
    } catch (err) {
      console.error(
        "Post class submit error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit class details."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <PageState>
        <Loader2
          size={30}
          className="animate-spin text-blue-600"
        />

        <p className="mt-3 text-sm text-slate-500">
          Loading class details...
        </p>
      </PageState>
    );
  }

  if (!session) {
    return (
      <PageState>
        <ClipboardCheck
          size={40}
          className="text-slate-300"
        />

        <h1 className="mt-4 text-xl font-black text-slate-950">
          Class not found
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          {error ||
            "This class session is unavailable."}
        </p>

        <button
          type="button"
          onClick={() =>
            router.push("/dashboard")
          }
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white"
        >
          <ArrowLeft size={15} />
          Dashboard
        </button>
      </PageState>
    );
  }

  const presentCount =
    students.filter(
      (student) => student.present
    ).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-4xl items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() =>
              router.push("/dashboard")
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft size={17} />
          </button>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
              Post Class
            </p>

            <h1 className="text-lg font-black text-slate-950">
              {session.title}
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

        {saved ? (
          <div className="rounded-[26px] border border-emerald-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={32} />
            </div>

            <h2 className="mt-5 text-xl font-black text-slate-950">
              Class submitted
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Attendance and class details have been
              submitted successfully.
            </p>
          </div>
        ) : (
          <>
            {/* Class info */}
            <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-700">
                  {session.subject}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-600">
                  {session.status}
                </span>
              </div>

              <h2 className="mt-3 text-xl font-black text-slate-950">
                {session.title}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Session ID: {session.id}
              </p>
            </section>

            {/* Attendance */}
            <section className="mt-6 rounded-[26px] border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div>
                  <h2 className="text-base font-black text-slate-950">
                    Attendance
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Mark students who attended the class.
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">
                  <Users size={14} />
                  {presentCount}/{students.length}
                </div>
              </div>

              {students.length === 0 ? (
                <div className="p-8 text-center">
                  <Users
                    size={28}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-sm font-black text-slate-700">
                    No students assigned
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {students.map(
                    (student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() =>
                          toggleAttendance(
                            student.id
                          )
                        }
                        className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-700">
                            {getInitials(
                              student.name
                            )}
                          </div>

                          <div>
                            <p className="text-sm font-black text-slate-800">
                              {student.name}
                            </p>

                            <p className="text-[10px] text-slate-400">
                              {student.id}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full ${
                            student.present
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          <CheckCircle2
                            size={19}
                          />
                        </div>
                      </button>
                    )
                  )}
                </div>
              )}
            </section>

            {/* Summary */}
            <section className="mt-6 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <label className="text-sm font-black text-slate-950">
                Class Summary
              </label>

              <p className="mt-1 text-xs text-slate-500">
                Classroom activity has been added automatically. Review and edit the generated notes before submitting.
              </p>

              <textarea
                value={summary}
                onChange={(event) =>
                  setSummary(
                    event.target.value
                  )
                }
                rows={5}
                maxLength={2000}
                placeholder="Example: Covered linear equations and solved practice questions."
                className="mt-4 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />

              <div className="mt-1 text-right text-[10px] text-slate-400">
                {summary.length}/2000
              </div>
            </section>

            {/* Notes */}
            <section className="mt-6 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <label className="text-sm font-black text-slate-950">
                Teacher Notes
              </label>

              <p className="mt-1 text-xs text-slate-500">
                Optional private notes for the next class.
              </p>

              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value
                  )
                }
                rows={4}
                maxLength={2000}
                placeholder="Example: Revise exercise 4 before the next class."
                className="mt-4 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />

              <div className="mt-1 text-right text-[10px] text-slate-400">
                {notes.length}/2000
              </div>
            </section>

            {/* Submit */}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  saving ||
                  !summary.trim()
                }
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Save size={17} />
                )}

                Submit Class
              </button>
            </div>
          </>
        )}
      </main>
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

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "S"
  );
}
