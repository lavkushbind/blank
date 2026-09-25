"use client";

import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
} from "firebase/firestore";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Loader2,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import { auth, db } from "@/lib/firebase/client";

type TeacherProfile = {
  name?: string;
  email?: string;
  phone?: string;

  applicationStatus?: string;
  kycStatus?: string;

  education?: string;
  qualification?: string;
  college?: string;
  university?: string;

  subjects?: string[];
  selectedSubjects?: string[];

  classesTaught?: string[];
  grades?: string[];

  boards?: string[];
  availableDays?: string[];
  timeSlots?: string[];

  groupAvailable?: boolean;
  individualAvailable?: boolean;
  maxGroupSize?: number;

  bio?: string;
  experience?: string;
  experienceYears?: number;

  kyc?: {
    status?: string;
    documentType?: string;
  };
};

export default function TeacherAccreditationPage() {
  const [teacher, setTeacher] =
    useState<TeacherProfile | null>(null);

  const [loading, setLoading] =
    useState(true);

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

          await loadTeacher(user.uid);
        }
      );

    return () => unsubscribe();
  }, []);

  async function loadTeacher(
    uid: string
  ) {
    try {
      setLoading(true);
      setError("");

      const teacherSnap =
        await getDoc(
          doc(db, "teachers", uid)
        );

      if (!teacherSnap.exists()) {
        throw new Error(
          "Teacher profile not found."
        );
      }

      setTeacher(
        teacherSnap.data() as TeacherProfile
      );
    } catch (err) {
      console.error(
        "Teacher accreditation error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load teacher profile."
      );
    } finally {
      setLoading(false);
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
          Loading profile...
        </p>
      </PageState>
    );
  }

  if (!teacher) {
    return (
      <PageState>
        <UserRound
          size={40}
          className="text-slate-300"
        />

        <h1 className="mt-4 text-xl font-black text-slate-950">
          Teacher profile unavailable
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          {error ||
            "Unable to load your teacher profile."}
        </p>

        <Link
          href="/dashboard"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white"
        >
          <ArrowLeft size={15} />
          Dashboard
        </Link>
      </PageState>
    );
  }

  const applicationStatus =
    teacher.applicationStatus ||
    "PENDING";

  const kycStatus =
    teacher.kycStatus ||
    teacher.kyc?.status ||
    "PENDING";

  const isApproved =
    applicationStatus === "APPROVED";

  const isKycVerified =
    kycStatus === "VERIFIED";

  const subjects =
    teacher.subjects ||
    teacher.selectedSubjects ||
    [];

  const classes =
    teacher.classesTaught ||
    teacher.grades ||
    [];

  const boards =
    teacher.boards || [];

  const days =
    teacher.availableDays || [];

  const slots =
    teacher.timeSlots || [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
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
              Profile & Verification
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Verification */}
        <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  isApproved &&
                  isKycVerified
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-amber-50 text-amber-600"
                }`}
              >
                <ShieldCheck size={25} />
              </div>

              <div>
                <h2 className="text-base font-black text-slate-950">
                  Teacher Verification
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Your teaching profile and KYC verification
                  status.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge
                label={`Application: ${applicationStatus}`}
                verified={isApproved}
              />

              <StatusBadge
                label={`KYC: ${kycStatus}`}
                verified={isKycVerified}
              />
            </div>
          </div>

          {!isApproved ||
          !isKycVerified ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <Clock3
                  size={18}
                  className="mt-0.5 shrink-0 text-amber-600"
                />

                <div>
                  <p className="text-sm font-black text-amber-900">
                    Verification pending
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    Production classes require an approved
                    teacher application and verified KYC.
                    Your current account status is shown above.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />

                <div>
                  <p className="text-sm font-black text-emerald-900">
                    Verification complete
                  </p>

                  <p className="mt-1 text-xs leading-5 text-emerald-800">
                    Your teacher application and KYC are
                    verified.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Basic profile */}
        <ProfileSection
          icon={<UserRound size={19} />}
          title="Basic Information"
          description="Your registered teacher information."
        >
          <InfoGrid>
            <Info
              label="Name"
              value={
                teacher.name ||
                "Not provided"
              }
            />

            <Info
              label="Email"
              value={
                teacher.email ||
                auth.currentUser?.email ||
                "Not provided"
              }
            />

            <Info
              label="Phone"
              value={
                teacher.phone ||
                "Not provided"
              }
            />
          </InfoGrid>
        </ProfileSection>

        {/* Education */}
        <ProfileSection
          icon={<GraduationCap size={19} />}
          title="Education"
          description="Your academic qualifications."
        >
          <InfoGrid>
            <Info
              label="Qualification"
              value={
                teacher.qualification ||
                teacher.education ||
                "Not provided"
              }
            />

            <Info
              label="College"
              value={
                teacher.college ||
                "Not provided"
              }
            />

            <Info
              label="University"
              value={
                teacher.university ||
                "Not provided"
              }
            />

            <Info
              label="Experience"
              value={formatExperience(
                teacher
              )}
            />
          </InfoGrid>
        </ProfileSection>

        {/* Teaching */}
        <ProfileSection
          icon={<BookOpen size={19} />}
          title="Teaching Profile"
          description="Subjects, classes and boards you teach."
        >
          <TagGroup
            label="Subjects"
            values={subjects}
          />

          <TagGroup
            label="Classes"
            values={classes}
          />

          <TagGroup
            label="Boards"
            values={boards}
          />

          {subjects.length === 0 &&
            classes.length === 0 &&
            boards.length === 0 && (
              <EmptyValue />
            )}
        </ProfileSection>

        {/* Availability */}
        <ProfileSection
          icon={<Clock3 size={19} />}
          title="Availability"
          description="Your currently configured teaching availability."
        >
          <TagGroup
            label="Available Days"
            values={days}
          />

          <TagGroup
            label="Time Slots"
            values={slots}
          />

          {days.length === 0 &&
            slots.length === 0 && (
              <EmptyValue />
            )}
        </ProfileSection>

        {/* Teaching modes */}
        <ProfileSection
          icon={<Users size={19} />}
          title="Class Preferences"
          description="Configured teaching modes for your account."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Preference
              label="Group Classes"
              enabled={
                teacher.groupAvailable === true
              }
            />

            <Preference
              label="Individual Classes"
              enabled={
                teacher.individualAvailable === true
              }
            />

            <Preference
              label="Max Group Size"
              enabled={
                typeof teacher.maxGroupSize ===
                "number"
              }
              value={
                typeof teacher.maxGroupSize ===
                "number"
                  ? String(
                      teacher.maxGroupSize
                    )
                  : undefined
              }
            />
          </div>
        </ProfileSection>

        {/* Bio */}
        {(teacher.bio ||
          teacher.experience) && (
          <ProfileSection
            icon={<UserRound size={19} />}
            title="About"
            description="Information from your teacher application."
          >
            {teacher.bio && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Bio
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {teacher.bio}
                </p>
              </div>
            )}

            {teacher.experience && (
              <div className="mt-5">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Experience
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {teacher.experience}
                </p>
              </div>
            )}
          </ProfileSection>
        )}
      </main>
    </div>
  );
}

function ProfileSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {icon}
        </div>

        <div>
          <h2 className="text-base font-black text-slate-950">
            {title}
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-5">
        {children}
      </div>
    </section>
  );
}

function InfoGrid({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {children}
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function TagGroup({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  return (
    <div className="mb-5 last:mb-0">
      <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>

      {values.length === 0 ? (
        <p className="text-xs text-slate-400">
          Not configured
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"
            >
              {value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Preference({
  label,
  enabled,
  value,
}: {
  label: string;
  enabled: boolean;
  value?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black text-slate-700">
          {label}
        </p>

        {enabled ? (
          <CheckCircle2
            size={16}
            className="text-emerald-600"
          />
        ) : (
          <span className="text-[10px] font-bold text-slate-400">
            No
          </span>
        )}
      </div>

      {value && (
        <p className="mt-2 text-lg font-black text-slate-900">
          {value}
        </p>
      )}
    </div>
  );
}

function StatusBadge({
  label,
  verified,
}: {
  label: string;
  verified: boolean;
}) {
  return (
    <span
      className={`rounded-full px-3 py-2 text-[10px] font-black ${
        verified
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {label}
    </span>
  );
}

function EmptyValue() {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-400">
      No information configured.
    </div>
  );
}

function formatExperience(
  teacher: TeacherProfile
) {
  if (
    typeof teacher.experienceYears ===
    "number"
  ) {
    return `${teacher.experienceYears} year${
      teacher.experienceYears !== 1
        ? "s"
        : ""
    }`;
  }

  if (teacher.experience) {
    return teacher.experience;
  }

  return "Not provided";
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