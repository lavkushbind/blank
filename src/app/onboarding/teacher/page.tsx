"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  arrayUnion,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  GraduationCap,
  Loader2,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Video,
} from "lucide-react";

import { auth, db } from "@/lib/firebase/client";
import { BrandLogo } from "@/components/BrandLogo";

/* =========================================================
   TYPES
========================================================= */

type Board =
  | "CBSE"
  | "ICSE"
  | "UP Board"
  | "State Board";

type Subject =
  | "Math"
  | "Science"
  | "English";

type Program =
  | "MATH_ONLY"
  | "ENGLISH_ONLY"
  | "ALL_SUBJECTS";

type TeachingMode =
  | "GROUP"
  | "INDIVIDUAL";

type Slot = {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
};

type FormData = {
  name: string;
  email: string;
  phone: string;
  city: string;

  qualification: string;
  institution: string;
  graduationYear: string;
  experienceYears: string;
  experienceDescription: string;

  boards: Board[];
  classes: string[];
  subjects: Subject[];

  programs: Program[];
  teachingModes: TeachingMode[];

  selectedDays: string[];
  slots: Slot[];

  videoUrl: string;
  profilePhotoUrl: string;
  bio: string;
  teachingApproach: string;

  idProofType: string;
  idProofUrl: string;
  qualificationProofUrl: string;

  accountHolderName: string;
  upiId: string;
};

/* =========================================================
   CONSTANTS
========================================================= */

const INITIAL_FORM: FormData = {
  name: "",
  email: "",
  phone: "",
  city: "",

  qualification: "",
  institution: "",
  graduationYear: "",
  experienceYears: "",
  experienceDescription: "",

  boards: [],
  classes: [],
  subjects: [],

  programs: [],
  teachingModes: [],

  selectedDays: [],
  slots: [],

  videoUrl: "",
  profilePhotoUrl: "",
  bio: "",
  teachingApproach: "",

  idProofType: "Aadhaar",
  idProofUrl: "",
  qualificationProofUrl: "",

  accountHolderName: "",
  upiId: "",
};

const BOARDS: Board[] = [
  "CBSE",
  "ICSE",
  "UP Board",
  "State Board",
];

const CLASSES = Array.from(
  { length: 10 },
  (_, index) => `Class ${index + 1}`
);

const SUBJECTS: Subject[] = [
  "Math",
  "Science",
  "English",
];

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const TIME_SLOTS = [
  ["06:00", "07:00"],
  ["07:00", "08:00"],
  ["08:00", "09:00"],
  ["09:00", "10:00"],
  ["10:00", "11:00"],
  ["11:00", "12:00"],
  ["12:00", "13:00"],
  ["13:00", "14:00"],
  ["14:00", "15:00"],
  ["15:00", "16:00"],
  ["16:00", "17:00"],
  ["17:00", "18:00"],
  ["18:00", "19:00"],
  ["19:00", "20:00"],
  ["20:00", "21:00"],
  ["21:00", "22:00"],
] as const;

const PROGRAMS: {
  id: Program;
  title: string;
  description: string;
  subjects: Subject[];
}[] = [
  {
    id: "MATH_ONLY",
    title: "Math",
    description: "Mathematics-focused demo and live classes.",
    subjects: ["Math"],
  },
  {
    id: "ENGLISH_ONLY",
    title: "English",
    description: "English-focused demo and live classes.",
    subjects: ["English"],
  },
  {
    id: "ALL_SUBJECTS",
    title: "Math + Science + English",
    description: "Complete three-subject learning program.",
    subjects: ["Math", "Science", "English"],
  },
];

const STEPS = [
  {
    title: "Personal",
    description: "Basic information about you.",
    icon: UserRound,
  },
  {
    title: "Education",
    description: "Your qualification and experience.",
    icon: GraduationCap,
  },
  {
    title: "Teaching",
    description: "Subjects, boards and classes.",
    icon: BookOpen,
  },
  {
    title: "Programs",
    description: "Programs and teaching formats.",
    icon: Sparkles,
  },
  {
    title: "Availability",
    description: "Your recurring teaching schedule.",
    icon: CalendarDays,
  },
  {
    title: "Profile",
    description: "Your public teacher profile.",
    icon: Video,
  },
  {
    title: "Review",
    description: "Review before submitting.",
    icon: ShieldCheck,
  },
];

/* =========================================================
   HELPERS
========================================================= */

function cn(
  ...classes: (
    | string
    | false
    | null
    | undefined
  )[]
) {
  return classes.filter(Boolean).join(" ");
}

function normalizeProgram(
  value: unknown
): Program | null {
  if (value === "MATH_ONLY") {
    return "MATH_ONLY";
  }

  if (value === "ENGLISH_ONLY") {
    return "ENGLISH_ONLY";
  }

  if (
    value === "ALL_SUBJECTS" ||
    value === "MATH_SCIENCE_ENGLISH"
  ) {
    return "ALL_SUBJECTS";
  }

  return null;
}

function normalizePrograms(
  value: unknown
): Program[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map(normalizeProgram)
        .filter(
          (item): item is Program =>
            item !== null
        )
    )
  );
}

function normalizeSlots(
  value: unknown
): Slot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item: any) => {
      const day =
        item?.day ||
        item?.dayOfWeek ||
        "";

      const startTime =
        item?.startTime || "";

      const endTime =
        item?.endTime || "";

      if (
        !day ||
        !startTime ||
        !endTime
      ) {
        return null;
      }

      return {
        id:
          item?.id ||
          item?.slotId ||
          `${day}-${startTime}`,
        day,
        startTime,
        endTime,
      };
    })
    .filter(Boolean) as Slot[];
}

function formatTime(time: string) {
  const [hourString, minuteString] =
    time.split(":");

  const hour = Number(hourString);
  const minute = Number(minuteString);

  const suffix =
    hour >= 12 ? "PM" : "AM";

  const displayHour =
    hour % 12 || 12;

  return `${displayHour}:${String(
    minute
  ).padStart(2, "0")} ${suffix}`;
}

function getResumeStep(
  form: FormData
) {
  if (
    !form.name ||
    !form.email ||
    !form.phone ||
    !form.city
  ) {
    return 0;
  }

  if (
    !form.qualification ||
    !form.institution ||
    !form.experienceDescription
  ) {
    return 1;
  }

  if (
    !form.boards.length ||
    !form.classes.length ||
    !form.subjects.length
  ) {
    return 2;
  }

  if (
    !form.programs.length ||
    !form.teachingModes.length
  ) {
    return 3;
  }

  if (
    !form.selectedDays.length ||
    !form.slots.length
  ) {
    return 4;
  }

  if (
    !form.videoUrl ||
    form.bio.length < 50 ||
    form.teachingApproach.length < 30
  ) {
    return 5;
  }

  return 6;
}

/* =========================================================
   MAIN
========================================================= */

export default function TeacherApplicationPage() {
  const router = useRouter();

  const [user, setUser] =
    useState<User | null>(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [loadingData, setLoadingData] =
    useState(true);

  const [hydrated, setHydrated] =
    useState(false);

  const [form, setForm] =
    useState<FormData>(INITIAL_FORM);

  const [step, setStep] = useState(0);

  const [saving, setSaving] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const [submitted, setSubmitted] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [activeDay, setActiveDay] =
    useState("");

  /* =======================================================
     AUTH
  ======================================================= */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
          setAuthLoading(false);

          if (!currentUser) {
            router.replace(
              "/teacher-auth"
            );
          }
        }
      );

    return unsubscribe;
  }, [router]);

  /* =======================================================
     LOAD EXISTING TEACHER
  ======================================================= */

  useEffect(() => {
    if (!user) {
      return;
    }

    const currentUser = user;

    let cancelled = false;

    async function loadTeacher() {
      try {
        setLoadingData(true);

        const teacherRef = doc(
          db,
          "teachers",
          currentUser.uid
        );

        const snapshot =
          await getDoc(teacherRef);

        if (cancelled) {
          return;
        }

        /*
         * No teacher document yet.
         */
        if (!snapshot.exists()) {
          const freshForm: FormData = {
            ...INITIAL_FORM,
            name:
              currentUser.displayName || "",
            email:
              currentUser.email || "",
          };

          setForm(freshForm);
          setStep(0);
          setHydrated(true);
          return;
        }

        const data = snapshot.data();

        /*
         * APPROVED + VERIFIED
         * ===================
         * Teacher should never see onboarding again.
         */
        const applicationStatus =
          data.applicationStatus;

        const kycStatus =
          data.kycStatus ||
          data.kyc?.status;

        if (
          applicationStatus ===
            "APPROVED" &&
          (
            kycStatus ===
              "VERIFIED" ||
            kycStatus ===
              "APPROVED"
          )
        ) {
          router.replace(
            "/dashboard"
          );
          return;
        }

        /*
         * PENDING
         * =======
         * Application has already been submitted.
         */
        if (
          applicationStatus ===
          "PENDING"
        ) {
          setSubmitted(true);
        }

        /*
         * Restore every saved field.
         */
        const restored: FormData = {
          name:
            data.name ||
            currentUser.displayName ||
            "",

          email:
            data.email ||
            currentUser.email ||
            "",

          phone:
            data.phone || "",

          city:
            data.city || "",

          qualification:
            data.qualification || "",

          institution:
            data.institution || "",

          graduationYear:
            data.graduationYear != null
              ? String(
                  data.graduationYear
                )
              : "",

          experienceYears:
            data.experienceYears != null
              ? String(
                  data.experienceYears
                )
              : "",

          experienceDescription:
            data.experienceDescription ||
            "",

          boards:
            Array.isArray(
              data.boards
            )
              ? data.boards
              : [],

          classes:
            Array.isArray(
              data.classesTaught
            )
              ? data.classesTaught
              : Array.isArray(
                  data.grades
                )
              ? data.grades
              : [],

          subjects:
            Array.isArray(
              data.subjects
            )
              ? data.subjects
              : [],

          programs:
            normalizePrograms(
              data.demoPrograms
            ),

          teachingModes:
            Array.isArray(
              data.teachingModes
            )
              ? data.teachingModes
              : [],

          selectedDays:
            Array.isArray(
              data.availableDays
            )
              ? data.availableDays
              : [],

          slots:
            normalizeSlots(
              data.availableSlots
            ),

          videoUrl:
            data.demoVideoUrl || "",

          profilePhotoUrl:
            data.profilePhotoUrl || "",

          bio:
            data.bio || "",

          teachingApproach:
            data.teachingApproach || "",

          idProofType:
            data.kyc?.idProofType ||
            "Aadhaar",

          idProofUrl:
            data.kyc?.idProofUrl || "",

          qualificationProofUrl:
            data.kyc
              ?.qualificationProofUrl ||
            "",

          accountHolderName:
            data.payout
              ?.accountHolderName ||
            "",

          upiId:
            data.payout?.upiId || "",
        };

        setForm(restored);

        setStep(
          getResumeStep(restored)
        );

        setActiveDay(
          restored.selectedDays[0] ||
            ""
        );

        setHydrated(true);
      } catch (err) {
        console.error(
          "Teacher load error:",
          err
        );

        setError(
          "Saved application load nahi ho paayi."
        );
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    }

    loadTeacher();

    return () => {
      cancelled = true;
    };
  }, [user, router]);

  /* =======================================================
     AUTO SAVE
  ======================================================= */

  useEffect(() => {
    /*
     * IMPORTANT:
     *
     * Do not auto-save before the Firestore
     * document has been loaded.
     */
    if (
      !hydrated ||
      !user ||
      submitted
    ) {
      return;
    }

    const currentUser = user;

    const timer = setTimeout(
      async () => {
        try {
          setSaving(true);
          setSaved(false);

          const teacherRef =
            doc(
              db,
              "teachers",
              currentUser.uid
            );

          /*
           * NEVER write:
           *
           * applicationStatus
           * kycStatus
           *
           * here.
           *
           * Otherwise PENDING / APPROVED
           * can accidentally become INCOMPLETE.
           */

          await setDoc(
            teacherRef,
            {
              uid: currentUser.uid,

              name:
                form.name.trim(),

              email:
                form.email
                  .trim()
                  .toLowerCase(),

              phone:
                form.phone.replace(
                  /\D/g,
                  ""
                ),

              city:
                form.city.trim(),

              qualification:
                form.qualification.trim(),

              institution:
                form.institution.trim(),

              graduationYear:
                form.graduationYear
                  ? Number(
                      form.graduationYear
                    )
                  : null,

              experienceYears:
                form.experienceYears
                  ? Number(
                      form.experienceYears
                    )
                  : 0,

              experienceDescription:
                form.experienceDescription.trim(),

              boards:
                form.boards,

              grades:
                form.classes,

              classesTaught:
                form.classes,

              subjects:
                form.subjects,

              demoPrograms:
                form.programs,

              teachingModes:
                form.teachingModes,

              availableDays:
                form.selectedDays,

              availableSlots:
                form.slots.map(
                  (slot) => ({
                    slotId: slot.id,
                    dayOfWeek:
                      slot.day,
                    startTime:
                      slot.startTime,
                    endTime:
                      slot.endTime,
                    isOccupied:
                      false,
                  })
                ),

              maxGroupSize: 5,

              groupAvailable:
                form.teachingModes.includes(
                  "GROUP"
                ),

              individualAvailable:
                form.teachingModes.includes(
                  "INDIVIDUAL"
                ),

              demoVideoUrl:
                form.videoUrl.trim(),

              profilePhotoUrl:
                form.profilePhotoUrl.trim(),

              bio:
                form.bio.trim(),

              teachingApproach:
                form.teachingApproach.trim(),

              kyc: {
                idProofType:
                  form.idProofType,

                idProofUrl:
                  form.idProofUrl.trim(),

                qualificationProofUrl:
                  form.qualificationProofUrl.trim(),
              },

              payout: {
                accountHolderName:
                  form.accountHolderName.trim(),

                upiId:
                  form.upiId.trim(),
              },

              updatedAt:
                serverTimestamp(),
            },
            {
              merge: true,
            }
          );

          setSaved(true);
        } catch (err) {
          console.error(
            "Teacher auto-save error:",
            err
          );
        } finally {
          setSaving(false);
        }
      },
      700
    );

    return () =>
      clearTimeout(timer);
  }, [
    form,
    hydrated,
    submitted,
    user,
  ]);

  /* =======================================================
     FIELD UPDATE
  ======================================================= */

  function updateField<
    K extends keyof FormData
  >(
    field: K,
    value: FormData[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setSaved(false);
    setError("");
  }

  function toggleArray<T>(
    field:
      | "boards"
      | "classes"
      | "subjects"
      | "programs"
      | "teachingModes"
      | "selectedDays",
    value: T
  ) {
    setForm((current) => {
      const existing =
        current[field] as T[];

      const next = existing.includes(
        value
      )
        ? existing.filter(
            (item) =>
              item !== value
          )
        : [
            ...existing,
            value,
          ];

      return {
        ...current,
        [field]: next,
      };
    });

    setSaved(false);
  }

  /* =======================================================
     AVAILABLE PROGRAMS
  ======================================================= */

  const availablePrograms =
    useMemo(() => {
      return PROGRAMS.filter(
        (program) =>
          program.subjects.every(
            (subject) =>
              form.subjects.includes(
                subject
              )
          )
      );
    }, [form.subjects]);

  /* =======================================================
     VALIDATION
  ======================================================= */

  function validateStep(
    currentStep = step
  ) {
    setError("");

    if (currentStep === 0) {
      if (
        form.name.trim().length < 3
      ) {
        setError(
          "Please enter your full name."
        );
        return false;
      }

      if (
        !/^\S+@\S+\.\S+$/.test(
          form.email.trim()
        )
      ) {
        setError(
          "Please enter a valid email."
        );
        return false;
      }

      if (
        !/^\d{10}$/.test(
          form.phone.replace(
            /\D/g,
            ""
          )
        )
      ) {
        setError(
          "Enter a valid 10-digit mobile number."
        );
        return false;
      }

      if (
        form.city.trim().length < 2
      ) {
        setError(
          "Please enter your city."
        );
        return false;
      }
    }

    if (currentStep === 1) {
      if (!form.qualification) {
        setError(
          "Please enter your qualification."
        );
        return false;
      }

      if (!form.institution) {
        setError(
          "Please enter your institution."
        );
        return false;
      }

      if (
        form.experienceDescription.trim()
          .length < 30
      ) {
        setError(
          "Please describe your teaching experience in at least 30 characters."
        );
        return false;
      }
    }

    if (currentStep === 2) {
      if (!form.boards.length) {
        setError(
          "Select at least one board."
        );
        return false;
      }

      if (!form.classes.length) {
        setError(
          "Select at least one class."
        );
        return false;
      }

      if (!form.subjects.length) {
        setError(
          "Select at least one subject."
        );
        return false;
      }
    }

    if (currentStep === 3) {
      if (!form.programs.length) {
        setError(
          "Select at least one program."
        );
        return false;
      }

      if (
        !form.teachingModes.length
      ) {
        setError(
          "Select Group or Individual teaching."
        );
        return false;
      }
    }

    if (currentStep === 4) {
      if (
        !form.selectedDays.length
      ) {
        setError(
          "Select at least one teaching day."
        );
        return false;
      }

      if (!form.slots.length) {
        setError(
          "Select at least one available slot."
        );
        return false;
      }
    }

    if (currentStep === 5) {
      if (!form.videoUrl.trim()) {
        setError(
          "Add your introduction video."
        );
        return false;
      }

      if (
        form.bio.trim().length < 50
      ) {
        setError(
          "Teacher bio should contain at least 50 characters."
        );
        return false;
      }

      if (
        form.teachingApproach.trim()
          .length < 30
      ) {
        setError(
          "Please describe your teaching approach."
        );
        return false;
      }
    }

    return true;
  }

  function nextStep() {
    if (!validateStep()) {
      return;
    }

    setStep((current) =>
      Math.min(
        current + 1,
        STEPS.length - 1
      )
    );
  }

  function previousStep() {
    setError("");

    setStep((current) =>
      Math.max(
        current - 1,
        0
      )
    );
  }

  /* =======================================================
     SLOT
  ======================================================= */

  function toggleSlot(
    day: string,
    startTime: string,
    endTime: string
  ) {
    const id =
      `${day}-${startTime}`;

    const exists =
      form.slots.some(
        (slot) =>
          slot.id === id
      );

    updateField(
      "slots",
      exists
        ? form.slots.filter(
            (slot) =>
              slot.id !== id
          )
        : [
            ...form.slots,
            {
              id,
              day,
              startTime,
              endTime,
            },
          ]
    );
  }

  /* =======================================================
     SUBMIT
  ======================================================= */

  async function submitApplication() {
    setError("");

    for (
      let index = 0;
      index < 6;
      index++
    ) {
      if (!validateStep(index)) {
        setStep(index);
        return;
      }
    }

    if (!user) {
      setError(
        "Authentication session not found."
      );
      return;
    }

    const currentUser = user;

    try {
      setSubmitting(true);

      const teacherRef =
        doc(
          db,
          "teachers",
          currentUser.uid
        );

      /*
       * SAME UID DOCUMENT
       *
       * Never addDoc().
       */
      await setDoc(
        teacherRef,
        {
          uid: currentUser.uid,

          name:
            form.name.trim(),

          email:
            form.email
              .trim()
              .toLowerCase(),

          phone:
            form.phone.replace(
              /\D/g,
              ""
            ),

          city:
            form.city.trim(),

          qualification:
            form.qualification.trim(),

          institution:
            form.institution.trim(),

          graduationYear:
            form.graduationYear
              ? Number(
                  form.graduationYear
                )
              : null,

          experienceYears:
            Number(
              form.experienceYears ||
                0
            ),

          experienceDescription:
            form.experienceDescription.trim(),

          boards:
            form.boards,

          grades:
            form.classes,

          classesTaught:
            form.classes,

          subjects:
            form.subjects,

          demoPrograms:
            form.programs,

          teachingModes:
            form.teachingModes,

          availableDays:
            form.selectedDays,

          availableSlots:
            form.slots.map(
              (slot) => ({
                slotId: slot.id,
                dayOfWeek:
                  slot.day,
                startTime:
                  slot.startTime,
                endTime:
                  slot.endTime,
                isOccupied:
                  false,
              })
            ),

          maxGroupSize: 5,

          groupAvailable:
            form.teachingModes.includes(
              "GROUP"
            ),

          individualAvailable:
            form.teachingModes.includes(
              "INDIVIDUAL"
            ),

          demoVideoUrl:
            form.videoUrl.trim(),

          profilePhotoUrl:
            form.profilePhotoUrl.trim(),

          bio:
            form.bio.trim(),

          teachingApproach:
            form.teachingApproach.trim(),

          kyc: {
            status: "PENDING",

            idProofType:
              form.idProofType,

            idProofUrl:
              form.idProofUrl.trim(),

            qualificationProofUrl:
              form.qualificationProofUrl.trim(),
          },

          payout: {
            accountHolderName:
              form.accountHolderName.trim(),

            upiId:
              form.upiId.trim(),
          },

          /*
           * ONLY SUBMIT CHANGES THESE.
           */
          applicationStatus:
            "PENDING",

          kycStatus:
            "PENDING",

          publicProfile: false,

          submittedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      /*
       * Add TEACHER capability.
       *
       * Existing STUDENT role is not removed
       * from roles array.
       */
      const userRef =
        doc(
          db,
          "users",
          currentUser.uid
        );

      await setDoc(
        userRef,
        {
          uid: currentUser.uid,

          name:
            form.name.trim(),

          email:
            form.email
              .trim()
              .toLowerCase(),

          roles:
            arrayUnion(
              "TEACHER"
            ),

          role: "TEACHER",

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      setSubmitted(true);
    } catch (err) {
      console.error(
        "Teacher submit error:",
        err
      );

      setError(
        "Application submit nahi ho paayi. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    authLoading ||
    loadingData
  ) {
    return (
      <LoadingScreen />
    );
  }

  /* =======================================================
     SUBMITTED
  ======================================================= */

  if (submitted) {
    return (
      <SubmittedScreen />
    );
  }

  const CurrentIcon =
    STEPS[step].icon;

  const progress =
    ((step + 1) /
      STEPS.length) *
    100;

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F7F9FC] text-[#0B1020]">

      <AmbientBackground />

      {/* HEADER */}

      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-2xl">

        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

          <Link
            href="/"
            className="group flex items-center gap-3"
          >

            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#0B1020] text-xs font-black text-white shadow-lg transition group-hover:-translate-y-0.5">
              <BrandLogo className="h-full w-full rounded-[inherit] object-cover" />
            </div>

            <div>
              <p className="text-[18px] font-black tracking-[-0.04em]">
                BlankLearn
              </p>

              <p className="text-[8px] font-black tracking-[0.25em] text-blue-600">
                LIVE LEARNING
              </p>
            </div>

          </Link>

          <div className="flex items-center gap-2">

            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm sm:flex">
              <ShieldCheck
                size={14}
                className="text-emerald-500"
              />
              Secure application
            </div>

            <div
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold",
                saving
                  ? "bg-blue-50 text-blue-600"
                  : saved
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-slate-100 text-slate-500"
              )}
            >
              {saving ? (
                <>
                  <Loader2
                    size={13}
                    className="animate-spin"
                  />
                  Saving
                </>
              ) : saved ? (
                <>
                  <Check size={13} />
                  Saved
                </>
              ) : (
                <>
                  <Save size={13} />
                  Auto-save
                </>
              )}
            </div>

          </div>

        </div>

      </header>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">

        <div className="grid gap-7 lg:grid-cols-[290px_minmax(0,1fr)]">

          {/* SIDEBAR */}

          <aside className="lg:sticky lg:top-[96px] lg:h-fit">

            <div className="mb-7">

              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-blue-600 shadow-sm">
                <Sparkles size={12} />
                Teacher onboarding
              </div>

              <h1 className="text-[31px] font-black leading-[1.05] tracking-[-0.05em]">
                Build your teaching profile.
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Complete your profile once.
                Your progress stays saved to
                your account.
              </p>

            </div>

            <div className="hidden space-y-2 lg:block">

              {STEPS.map(
                (item, index) => {
                  const Icon =
                    item.icon;

                  const active =
                    index === step;

                  const complete =
                    index < step;

                  return (
                    <button
                      key={
                        item.title
                      }
                      type="button"
                      disabled={
                        index > step
                      }
                      onClick={() => {
                        if (
                          index <=
                          step
                        ) {
                          setStep(
                            index
                          );
                          setError("");
                        }
                      }}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-[18px] px-3.5 py-3.5 text-left transition-all duration-300",
                        active
                          ? "bg-[#0B1020] text-white shadow-[0_16px_35px_rgba(11,16,32,.18)]"
                          : complete
                          ? "bg-white text-slate-700 shadow-sm hover:shadow-md"
                          : "text-slate-400"
                      )}
                    >

                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]",
                          active
                            ? "bg-white/10"
                            : complete
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-100"
                        )}
                      >
                        {complete ? (
                          <Check size={16} />
                        ) : (
                          <Icon size={16} />
                        )}
                      </div>

                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                          Step{" "}
                          {index + 1}
                        </p>

                        <p className="mt-0.5 text-sm font-black">
                          {item.title}
                        </p>
                      </div>

                      {active && (
                        <ChevronRight
                          size={17}
                          className="ml-auto text-slate-500"
                        />
                      )}

                    </button>
                  );
                }
              )}

            </div>

            <div className="lg:hidden">

              <div className="flex items-end justify-between">

                <div>
                  <p className="text-xs font-black">
                    Step {step + 1} of{" "}
                    {STEPS.length}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {STEPS[step].title}
                  </p>
                </div>

                <p className="text-xs font-black text-blue-600">
                  {Math.round(
                    progress
                  )}
                  %
                </p>

              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

            </div>

            <div className="mt-6 hidden rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm lg:block">

              <div className="flex gap-3">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Save size={16} />
                </div>

                <div>
                  <p className="text-xs font-black">
                    Progress is saved
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-slate-500">
                    Refresh or close the
                    browser. Your completed
                    fields remain saved.
                  </p>
                </div>

              </div>

            </div>

          </aside>

          {/* FORM */}

          <section className="min-w-0">

            <div className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_30px_100px_rgba(15,23,42,.08)]">

              <div className="h-1 bg-slate-100">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <div className="border-b border-slate-100 px-5 py-5 sm:px-8 sm:py-6">

                <div className="flex items-center justify-between gap-4">

                  <div className="flex items-center gap-3">

                    <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-blue-50 text-blue-600">
                      <CurrentIcon size={20} />
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
                        Step {step + 1}
                      </p>

                      <h2 className="text-xl font-black tracking-[-0.03em]">
                        {STEPS[step].title}
                      </h2>
                    </div>

                  </div>

                  <div className="hidden text-right sm:block">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                      Complete
                    </p>

                    <p className="mt-1 text-sm font-black">
                      {Math.round(
                        progress
                      )}
                      %
                    </p>
                  </div>

                </div>

                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
                  {STEPS[step].description}
                </p>

              </div>

              <div className="p-5 sm:p-8">

                {error && (
                  <div className="mb-6 flex items-start gap-3 rounded-[17px] border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-semibold text-red-700">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 font-black">
                      !
                    </span>
                    {error}
                  </div>
                )}

                {/* STEP 1 */}

                {step === 0 && (
                  <StepShell
                    eyebrow="About you"
                    title="Let's start with the basics."
                    description="These details connect your application to your BlankLearn teacher account."
                  >
                    <div className="grid gap-5 sm:grid-cols-2">

                      <Field
                        label="Full name"
                        required
                      >
                        <Input
                          value={form.name}
                          onChange={(value) =>
                            updateField(
                              "name",
                              value
                            )
                          }
                          placeholder="Your full name"
                        />
                      </Field>

                      <Field
                        label="Email"
                        required
                      >
                        <Input
                          type="email"
                          value={form.email}
                          onChange={(value) =>
                            updateField(
                              "email",
                              value
                            )
                          }
                          placeholder="you@example.com"
                        />
                      </Field>

                      <Field
                        label="WhatsApp / Phone"
                        required
                      >
                        <Input
                          value={form.phone}
                          onChange={(value) =>
                            updateField(
                              "phone",
                              value
                                .replace(
                                  /\D/g,
                                  ""
                                )
                                .slice(
                                  0,
                                  10
                                )
                            )
                          }
                          placeholder="10-digit mobile number"
                        />
                      </Field>

                      <Field
                        label="City"
                        required
                      >
                        <Input
                          value={form.city}
                          onChange={(value) =>
                            updateField(
                              "city",
                              value
                            )
                          }
                          placeholder="e.g. Kanpur"
                        />
                      </Field>

                    </div>

                    <InfoBox
                      title="One account. One saved application."
                      text="Everything is stored against your Firebase UID. Refreshing the page will not reset your application."
                    />
                  </StepShell>
                )}

                {/* STEP 2 */}

                {step === 1 && (
                  <StepShell
                    eyebrow="Your background"
                    title="Tell us about your education."
                    description="This helps us understand your academic and teaching experience."
                  >
                    <div className="grid gap-5 sm:grid-cols-2">

                      <Field
                        label="Highest qualification"
                        required
                      >
                        <Input
                          value={
                            form.qualification
                          }
                          onChange={(value) =>
                            updateField(
                              "qualification",
                              value
                            )
                          }
                          placeholder="B.Tech, M.Sc, B.Ed..."
                        />
                      </Field>

                      <Field
                        label="College / University"
                        required
                      >
                        <Input
                          value={
                            form.institution
                          }
                          onChange={(value) =>
                            updateField(
                              "institution",
                              value
                            )
                          }
                          placeholder="Institution name"
                        />
                      </Field>

                      <Field label="Graduation year">
                        <Input
                          value={
                            form.graduationYear
                          }
                          onChange={(value) =>
                            updateField(
                              "graduationYear",
                              value
                                .replace(
                                  /\D/g,
                                  ""
                                )
                                .slice(
                                  0,
                                  4
                                )
                            )
                          }
                          placeholder="2024"
                        />
                      </Field>

                      <Field label="Teaching experience">
                        <Input
                          value={
                            form.experienceYears
                          }
                          onChange={(value) =>
                            updateField(
                              "experienceYears",
                              value
                                .replace(
                                  /\D/g,
                                  ""
                                )
                                .slice(
                                  0,
                                  2
                                )
                            )
                          }
                          placeholder="Years"
                        />
                      </Field>

                    </div>

                    <Field
                      label="Teaching experience details"
                      required
                    >
                      <Textarea
                        value={
                          form.experienceDescription
                        }
                        onChange={(value) =>
                          updateField(
                            "experienceDescription",
                            value
                          )
                        }
                        placeholder="Tell us about your teaching experience, students, subjects and online/live teaching experience."
                      />

                      <Counter
                        value={
                          form.experienceDescription
                        }
                        min={30}
                      />
                    </Field>
                  </StepShell>
                )}

                {/* STEP 3 */}

                {step === 2 && (
                  <StepShell
                    eyebrow="Teaching capability"
                    title="What can you teach?"
                    description="Select the subjects, classes and boards you are genuinely comfortable teaching."
                  >
                    <ChoiceSection
                      title="Boards"
                      description="Select all applicable boards."
                    >
                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                        {BOARDS.map(
                          (board) => (
                            <ChoiceTile
                              key={board}
                              label={board}
                              selected={form.boards.includes(
                                board
                              )}
                              onClick={() =>
                                toggleArray(
                                  "boards",
                                  board
                                )
                              }
                            />
                          )
                        )}
                      </div>
                    </ChoiceSection>

                    <ChoiceSection
                      title="Classes"
                      description="Select the classes you can confidently teach."
                    >
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                        {CLASSES.map(
                          (item) => (
                            <ChoiceTile
                              key={item}
                              label={item}
                              selected={form.classes.includes(
                                item
                              )}
                              onClick={() =>
                                toggleArray(
                                  "classes",
                                  item
                                )
                              }
                            />
                          )
                        )}
                      </div>
                    </ChoiceSection>

                    <ChoiceSection
                      title="Subjects"
                      description="Your core teaching subjects."
                    >
                      <div className="grid gap-3 sm:grid-cols-3">
                        {SUBJECTS.map(
                          (subject) => (
                            <SubjectCard
                              key={subject}
                              subject={subject}
                              selected={form.subjects.includes(
                                subject
                              )}
                              onClick={() =>
                                toggleArray(
                                  "subjects",
                                  subject
                                )
                              }
                            />
                          )
                        )}
                      </div>
                    </ChoiceSection>
                  </StepShell>
                )}

                {/* STEP 4 */}

                {step === 3 && (
                  <StepShell
                    eyebrow="Programs"
                    title="Choose how you want to teach."
                    description="Available programs automatically follow your selected subjects."
                  >
                    <ChoiceSection
                      title="Demo programs"
                      description="Choose the programs you want to offer."
                    >
                      <div className="space-y-3">
                        {availablePrograms.length ===
                        0 ? (
                          <EmptyState
                            title="Choose subjects first"
                            description="Go back and select your subjects."
                          />
                        ) : (
                          availablePrograms.map(
                            (program) => {
                              const selected =
                                form.programs.includes(
                                  program.id
                                );

                              return (
                                <button
                                  key={
                                    program.id
                                  }
                                  type="button"
                                  onClick={() =>
                                    toggleArray(
                                      "programs",
                                      program.id
                                    )
                                  }
                                  className={cn(
                                    "flex w-full items-center justify-between rounded-[20px] border p-4 text-left transition-all duration-300",
                                    selected
                                      ? "border-blue-500 bg-blue-50/70 shadow-sm"
                                      : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                                  )}
                                >
                                  <div className="flex items-center gap-4">

                                    <div
                                      className={cn(
                                        "flex h-11 w-11 items-center justify-center rounded-[14px]",
                                        selected
                                          ? "bg-blue-600 text-white"
                                          : "bg-slate-100 text-slate-500"
                                      )}
                                    >
                                      <Sparkles
                                        size={18}
                                      />
                                    </div>

                                    <div>
                                      <p className="text-sm font-black">
                                        {
                                          program.title
                                        }
                                      </p>

                                      <p className="mt-1 text-xs text-slate-500">
                                        {
                                          program.description
                                        }
                                      </p>
                                    </div>

                                  </div>

                                  <CheckCircle
                                    selected={
                                      selected
                                    }
                                  />
                                </button>
                              );
                            }
                          )
                        )}
                      </div>
                    </ChoiceSection>

                    <ChoiceSection
                      title="Teaching format"
                      description="Choose one or both."
                    >
                      <div className="grid gap-3 sm:grid-cols-2">

                        <ModeCard
                          title="Group"
                          description="Small live class · maximum 5 students"
                          icon={
                            <Users size={19} />
                          }
                          selected={form.teachingModes.includes(
                            "GROUP"
                          )}
                          onClick={() =>
                            toggleArray(
                              "teachingModes",
                              "GROUP"
                            )
                          }
                        />

                        <ModeCard
                          title="Individual"
                          description="Private live class · 1 student"
                          icon={
                            <UserRound size={19} />
                          }
                          selected={form.teachingModes.includes(
                            "INDIVIDUAL"
                          )}
                          onClick={() =>
                            toggleArray(
                              "teachingModes",
                              "INDIVIDUAL"
                            )
                          }
                        />

                      </div>
                    </ChoiceSection>
                  </StepShell>
                )}

                {/* STEP 5 */}

                {step === 4 && (
                  <StepShell
                    eyebrow="Availability"
                    title="Build your recurring schedule."
                    description="Choose the days and one-hour slots when you can consistently teach."
                  >
                    <ChoiceSection
                      title="Teaching days"
                      description="Select one or more days."
                    >
                      <div className="flex flex-wrap gap-2">
                        {DAYS.map(
                          (day) => {
                            const selected =
                              form.selectedDays.includes(
                                day
                              );

                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => {
                                  const exists =
                                    form.selectedDays.includes(
                                      day
                                    );

                                  toggleArray(
                                    "selectedDays",
                                    day
                                  );

                                  if (
                                    exists
                                  ) {
                                    updateField(
                                      "slots",
                                      form.slots.filter(
                                        (
                                          slot
                                        ) =>
                                          slot.day !==
                                          day
                                      )
                                    );
                                  }

                                  if (
                                    !exists
                                  ) {
                                    setActiveDay(
                                      day
                                    );
                                  }
                                }}
                                className={cn(
                                  "rounded-[14px] border px-4 py-2.5 text-xs font-black transition",
                                  selected
                                    ? "border-blue-500 bg-blue-50 text-blue-600"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                )}
                              >
                                {day}
                              </button>
                            );
                          }
                        )}
                      </div>
                    </ChoiceSection>

                    <Availability
                      selectedDays={
                        form.selectedDays
                      }
                      slots={form.slots}
                      activeDay={
                        activeDay ||
                        form.selectedDays[0] ||
                        ""
                      }
                      setActiveDay={
                        setActiveDay
                      }
                      onToggleSlot={
                        toggleSlot
                      }
                    />
                  </StepShell>
                )}

                {/* STEP 6 */}

                {step === 5 && (
                  <StepShell
                    eyebrow="Your profile"
                    title="Show parents how you teach."
                    description="Create a profile that clearly explains your teaching style."
                  >
                    <div className="space-y-5">

                      <Field
                        label="2-minute introduction video URL"
                        required
                      >
                        <Input
                          type="url"
                          value={
                            form.videoUrl
                          }
                          onChange={(value) =>
                            updateField(
                              "videoUrl",
                              value
                            )
                          }
                          placeholder="YouTube / Google Drive video URL"
                        />
                      </Field>

                      <Field label="Profile photo URL">
                        <Input
                          type="url"
                          value={
                            form.profilePhotoUrl
                          }
                          onChange={(value) =>
                            updateField(
                              "profilePhotoUrl",
                              value
                            )
                          }
                          placeholder="Optional profile image URL"
                        />
                      </Field>

                      <Field
                        label="Teacher bio"
                        required
                      >
                        <Textarea
                          value={form.bio}
                          onChange={(value) =>
                            updateField(
                              "bio",
                              value
                            )
                          }
                          placeholder="Introduce yourself to parents and students..."
                        />

                        <Counter
                          value={form.bio}
                          min={50}
                        />
                      </Field>

                      <Field
                        label="Teaching approach"
                        required
                      >
                        <Textarea
                          value={
                            form.teachingApproach
                          }
                          onChange={(value) =>
                            updateField(
                              "teachingApproach",
                              value
                            )
                          }
                          placeholder="How do you explain concepts, interact with students and conduct live classes?"
                        />

                        <Counter
                          value={
                            form.teachingApproach
                          }
                          min={30}
                        />
                      </Field>

                    </div>

                    <div className="border-t border-slate-100 pt-7">

                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
                        Verification
                      </p>

                      <h3 className="mt-1 text-lg font-black">
                        Verification & payout
                      </h3>

                      <div className="mt-5 grid gap-5 sm:grid-cols-2">

                        <Field label="ID proof type">
                          <select
                            value={
                              form.idProofType
                            }
                            onChange={(event) =>
                              updateField(
                                "idProofType",
                                event.target.value
                              )
                            }
                            className="h-12 w-full rounded-[13px] border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                          >
                            <option>
                              Aadhaar
                            </option>
                            <option>
                              PAN
                            </option>
                            <option>
                              Passport
                            </option>
                            <option>
                              Driving Licence
                            </option>
                          </select>
                        </Field>

                        <Field label="ID proof URL">
                          <Input
                            type="url"
                            value={
                              form.idProofUrl
                            }
                            onChange={(value) =>
                              updateField(
                                "idProofUrl",
                                value
                              )
                            }
                            placeholder="Secure document URL"
                          />
                        </Field>

                        <Field label="Qualification proof URL">
                          <Input
                            type="url"
                            value={
                              form.qualificationProofUrl
                            }
                            onChange={(value) =>
                              updateField(
                                "qualificationProofUrl",
                                value
                              )
                            }
                            placeholder="Degree / certificate URL"
                          />
                        </Field>

                        <Field label="UPI ID">
                          <Input
                            value={form.upiId}
                            onChange={(value) =>
                              updateField(
                                "upiId",
                                value
                              )
                            }
                            placeholder="teacher@upi"
                          />
                        </Field>

                      </div>
                    </div>
                  </StepShell>
                )}

                {/* STEP 7 */}

                {step === 6 && (
                  <StepShell
                    eyebrow="Final review"
                    title="Review your application."
                    description="Everything is stored against your teacher account."
                  >
                    <ReviewBlock
                      title="Personal"
                      icon={
                        <UserRound size={17} />
                      }
                      rows={[
                        ["Name", form.name],
                        ["Email", form.email],
                        ["Phone", form.phone],
                        ["City", form.city],
                      ]}
                    />

                    <ReviewBlock
                      title="Education"
                      icon={
                        <GraduationCap
                          size={17}
                        />
                      }
                      rows={[
                        [
                          "Qualification",
                          form.qualification,
                        ],
                        [
                          "Institution",
                          form.institution,
                        ],
                        [
                          "Experience",
                          `${
                            form.experienceYears ||
                            0
                          } years`,
                        ],
                      ]}
                    />

                    <ReviewBlock
                      title="Teaching"
                      icon={
                        <BookOpen size={17} />
                      }
                      rows={[
                        [
                          "Boards",
                          form.boards.join(
                            ", "
                          ),
                        ],
                        [
                          "Classes",
                          form.classes.join(
                            ", "
                          ),
                        ],
                        [
                          "Subjects",
                          form.subjects.join(
                            ", "
                          ),
                        ],
                      ]}
                    />

                    <ReviewBlock
                      title="Programs"
                      icon={
                        <Sparkles size={17} />
                      }
                      rows={[
                        [
                          "Programs",
                          form.programs
                            .map(
                              (id) =>
                                PROGRAMS.find(
                                  (program) =>
                                    program.id ===
                                    id
                                )?.title ||
                                id
                            )
                            .join(", "),
                        ],
                        [
                          "Modes",
                          form.teachingModes
                            .map(
                              (mode) =>
                                mode ===
                                "GROUP"
                                  ? "Group"
                                  : "Individual"
                            )
                            .join(
                              ", "
                            ),
                        ],
                      ]}
                    />

                    <ReviewBlock
                      title="Availability"
                      icon={
                        <CalendarDays
                          size={17}
                        />
                      }
                      rows={[
                        [
                          "Days",
                          form.selectedDays.join(
                            ", "
                          ),
                        ],
                        [
                          "Slots",
                          `${form.slots.length} one-hour slots`,
                        ],
                      ]}
                    />

                    <ReviewBlock
                      title="Profile"
                      icon={
                        <Video size={17} />
                      }
                      rows={[
                        [
                          "Video",
                          form.videoUrl
                            ? "Added"
                            : "Missing",
                        ],
                        [
                          "Bio",
                          form.bio
                            ? "Added"
                            : "Missing",
                        ],
                        [
                          "Teaching approach",
                          form.teachingApproach
                            ? "Added"
                            : "Missing",
                        ],
                      ]}
                    />

                    <div className="rounded-[22px] border border-blue-100 bg-gradient-to-br from-blue-50 via-indigo-50 to-white p-5">

                      <div className="flex gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                          <ShieldCheck
                            size={19}
                          />
                        </div>

                        <div>
                          <p className="text-sm font-black">
                            Ready to submit
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Your application will
                            move to{" "}
                            <strong className="text-slate-800">
                              PENDING
                            </strong>{" "}
                            and will wait for
                            admin verification.
                          </p>
                        </div>

                      </div>

                    </div>
                  </StepShell>
                )}

                {/* FOOTER */}

                <div className="mt-9 flex items-center justify-between border-t border-slate-100 pt-5">

                  <button
                    type="button"
                    onClick={
                      previousStep
                    }
                    disabled={
                      step === 0 ||
                      submitting
                    }
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black",
                      step === 0
                        ? "invisible"
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>

                  {step <
                  STEPS.length - 1 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="group inline-flex items-center gap-2 rounded-[14px] bg-[#0B1020] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5"
                    >
                      Continue
                      <ArrowRight
                        size={16}
                        className="transition group-hover:translate-x-0.5"
                      />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={
                        submitApplication
                      }
                      disabled={
                        submitting
                      }
                      className="inline-flex items-center gap-2 rounded-[14px] bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-[0_12px_30px_rgba(37,99,235,.22)] transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit application
                          <Check size={16} />
                        </>
                      )}
                    </button>
                  )}

                </div>

              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function AmbientBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-32 top-32 h-[360px] w-[360px] rounded-full bg-blue-200/20 blur-[120px]" />
      <div className="absolute -right-32 top-[25%] h-[400px] w-[400px] rounded-full bg-indigo-200/20 blur-[130px]" />
      <div className="absolute bottom-0 left-[35%] h-[300px] w-[300px] rounded-full bg-violet-200/10 blur-[120px]" />
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F7F9FC]">
      <AmbientBackground />

      <div className="relative text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[17px] bg-[#0B1020] text-sm font-black text-white shadow-xl">
          <BrandLogo className="h-full w-full rounded-[inherit] object-cover" />
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-slate-500">
          <Loader2
            size={16}
            className="animate-spin text-blue-600"
          />
          Restoring your application
        </div>

        <p className="mt-2 text-xs text-slate-400">
          Your saved progress is safe.
        </p>
      </div>
    </div>
  );
}

function StepShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
          {eyebrow}
        </p>

        <h3 className="mt-2 text-[27px] font-black leading-tight tracking-[-0.04em]">
          {title}
        </h3>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>

      <div className="space-y-8">
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-blue-600">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) =>
        onChange(
          event.target.value
        )
      }
      placeholder={placeholder}
      className="h-12 w-full rounded-[13px] border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) =>
        onChange(
          event.target.value
        )
      }
      placeholder={placeholder}
      rows={6}
      className="w-full resize-none rounded-[13px] border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
    />
  );
}

function Counter({
  value,
  min,
}: {
  value: string;
  min: number;
}) {
  const count =
    value.trim().length;

  return (
    <div className="mt-2 flex justify-end">
      <span
        className={cn(
          "text-[10px] font-bold",
          count >= min
            ? "text-emerald-600"
            : "text-slate-400"
        )}
      >
        {count} / {min}
      </span>
    </div>
  );
}

function ChoiceSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-base font-black">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>

      <div className="mt-4">
        {children}
      </div>
    </div>
  );
}

function ChoiceTile({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between rounded-[14px] border px-3.5 py-3 text-left text-xs font-black transition",
        selected
          ? "border-blue-500 bg-blue-50 text-blue-600 shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:shadow-sm"
      )}
    >
      {label}

      <CheckCircle
        selected={selected}
      />
    </button>
  );
}

function CheckCircle({
  selected,
}: {
  selected: boolean;
}) {
  return (
    <span
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
        selected
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-slate-300"
      )}
    >
      {selected && (
        <Check size={12} />
      )}
    </span>
  );
}

function SubjectCard({
  subject,
  selected,
  onClick,
}: {
  subject: Subject;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[19px] border p-4 text-left transition",
        selected
          ? "border-blue-500 bg-blue-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
      )}
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-[13px]",
            selected
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-500"
          )}
        >
          <BookOpen size={17} />
        </div>

        <CheckCircle
          selected={selected}
        />
      </div>

      <p className="mt-4 text-sm font-black">
        {subject}
      </p>

      <p className="mt-1 text-[11px] text-slate-400">
        Live teaching
      </p>
    </button>
  );
}

function ModeCard({
  title,
  description,
  icon,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between rounded-[19px] border p-4 text-left transition",
        selected
          ? "border-blue-500 bg-blue-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-[14px]",
            selected
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-500"
          )}
        >
          {icon}
        </div>

        <div>
          <p className="text-sm font-black">
            {title}
          </p>

          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <CheckCircle
        selected={selected}
      />
    </button>
  );
}

function Availability({
  selectedDays,
  slots,
  activeDay,
  setActiveDay,
  onToggleSlot,
}: {
  selectedDays: string[];
  slots: Slot[];
  activeDay: string;
  setActiveDay: (
    day: string
  ) => void;
  onToggleSlot: (
    day: string,
    start: string,
    end: string
  ) => void;
}) {
  if (!selectedDays.length) {
    return (
      <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <CalendarDays
          size={24}
          className="mx-auto text-slate-400"
        />

        <p className="mt-3 text-sm font-black">
          Select teaching days first
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Your one-hour slots will
          appear here.
        </p>
      </div>
    );
  }

  const currentSlots =
    slots.filter(
      (slot) =>
        slot.day === activeDay
    );

  return (
    <ChoiceSection
      title="One-hour slots"
      description="Choose recurring one-hour slots."
    >
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {selectedDays.map(
          (day) => {
            const count =
              slots.filter(
                (slot) =>
                  slot.day === day
              ).length;

            const active =
              day === activeDay;

            return (
              <button
                key={day}
                type="button"
                onClick={() =>
                  setActiveDay(day)
                }
                className={cn(
                  "min-w-[120px] shrink-0 rounded-[17px] border p-3 text-left transition",
                  active
                    ? "border-[#0B1020] bg-[#0B1020] text-white shadow-lg"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                )}
              >
                <p className="text-xs font-black">
                  {day}
                </p>

                <p className="mt-1 text-[10px] text-slate-400">
                  {count} selected
                </p>
              </button>
            );
          }
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {TIME_SLOTS.map(
          ([start, end]) => {
            const id =
              `${activeDay}-${start}`;

            const selected =
              slots.some(
                (slot) =>
                  slot.id === id
              );

            return (
              <button
                key={id}
                type="button"
                onClick={() =>
                  onToggleSlot(
                    activeDay,
                    start,
                    end
                  )
                }
                className={cn(
                  "flex items-center justify-between rounded-[17px] border px-3.5 py-3 text-left transition",
                  selected
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl",
                      selected
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-500"
                    )}
                  >
                    <Clock3 size={15} />
                  </div>

                  <div>
                    <p className="text-xs font-black">
                      {formatTime(start)}
                      {" – "}
                      {formatTime(end)}
                    </p>

                    <p className="mt-0.5 text-[10px] text-slate-400">
                      1 hour
                    </p>
                  </div>
                </div>

                <CheckCircle
                  selected={selected}
                />
              </button>
            );
          }
        )}
      </div>

      <div className="mt-5 flex items-center justify-between rounded-[17px] bg-slate-50 px-4 py-3">
        <p className="text-xs text-slate-500">
          <strong className="text-slate-900">
            {currentSlots.length}
          </strong>{" "}
          slots on{" "}
          <strong className="text-slate-900">
            {activeDay}
          </strong>
        </p>

        <p className="text-xs font-black text-blue-600">
          {slots.length} total
        </p>
      </div>
    </ChoiceSection>
  );
}

function InfoBox({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4">
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
          <ShieldCheck size={17} />
        </div>

        <div>
          <p className="text-sm font-black">
            {title}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <Sparkles
        size={22}
        className="mx-auto text-slate-400"
      />

      <p className="mt-3 text-sm font-black">
        {title}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}

function ReviewBlock({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: React.ReactNode;
  rows: Array<
    [string, string]
  >;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-blue-600">
          {icon}
        </span>

        <h3 className="text-sm font-black">
          {title}
        </h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map(
          ([label, value]) => (
            <div key={label}>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                {label}
              </p>

              <p className="mt-1 text-xs font-semibold leading-5 text-slate-700">
                {value || "—"}
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function SubmittedScreen() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F7F9FC] px-5">
      <AmbientBackground />

      <div className="relative w-full max-w-[650px]">

        <div className="mb-6 flex justify-center">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#0B1020] text-xs font-black text-white">
              <BrandLogo className="h-full w-full rounded-[inherit] object-cover" />
            </div>

            <div>
              <p className="text-lg font-black">
                BlankLearn
              </p>

              <p className="text-[8px] font-black tracking-[0.25em] text-blue-600">
                LIVE LEARNING
              </p>
            </div>
          </Link>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-7 text-center shadow-[0_30px_100px_rgba(15,23,42,.10)] sm:p-12">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={34} />
          </div>

          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
            Application submitted
          </p>

          <h1 className="mt-3 text-[32px] font-black leading-tight tracking-[-0.045em] sm:text-[40px]">
            Your application is saved.
          </h1>

          <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-slate-500">
            Your teacher application is
            now{" "}
            <strong className="text-slate-800">
              PENDING
            </strong>{" "}
            for admin review.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Status
              number="01"
              title="Submitted"
              text="Application saved"
            />

            <Status
              number="02"
              title="Verification"
              text="Admin review"
            />

            <Status
              number="03"
              title="Approval"
              text="Dashboard access"
            />
          </div>

          <div className="mt-7 rounded-[18px] border border-blue-100 bg-blue-50 p-4 text-left">
            <div className="flex gap-3">
              <ShieldCheck
                size={19}
                className="mt-0.5 shrink-0 text-blue-600"
              />

              <p className="text-xs leading-5 text-blue-900/70">
                Once your application is
                approved and KYC is verified,
                opening this page will
                automatically take you to the
                teacher dashboard.
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="mt-7 inline-flex rounded-[13px] bg-[#0B1020] px-6 py-3 text-sm font-black text-white transition hover:bg-[#161C2E]"
          >
            Back to BlankLearn
          </Link>

        </div>
      </div>
    </main>
  );
}

function Status({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4 text-left">
      <p className="text-[10px] font-black tracking-[0.15em] text-slate-400">
        {number}
      </p>

      <p className="mt-2 text-sm font-black">
        {title}
      </p>

      <p className="mt-1 text-[11px] text-slate-500">
        {text}
      </p>
    </div>
  );
}