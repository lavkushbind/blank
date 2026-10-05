"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Timestamp,
} from "firebase/firestore";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  auth,
  db,
} from "@/lib/firebase/client";

import {
  readApiResponse,
} from "@/lib/api-response";

import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  MonitorPlay,
  Pencil,
  Play,
  Radio,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Video,
  X,
} from "lucide-react";

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

type ProfileSlot = {
  slotId?: string;
  dayOfWeek?: string;
  day?: string;

  startTime: string;
  endTime: string;

  isOccupied?: boolean;
};

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

  kyc?: {
    idProofType?: string;
    idProofUrl?: string;
    qualificationProofUrl?: string;
  };

  payout?: {
    accountHolderName?: string;
    upiId?: string;
  };
}

interface Batch {
  id: string;

  name?: string;
  title?: string;

  subject?: string;
  subjects?: string[];

  status?: string;
  type?: string;

  classNumber?: number;
  board?: string;

  studentIds?: string[];
}

type TeacherProfileDraft = {
  name: string;
  email: string;
  phone: string;
  city: string;

  qualification: string;
  institution: string;
  graduationYear: string;

  experienceYears: string;
  experienceDescription: string;

  boards: string[];
  grades: string[];
  subjects: string[];

  demoPrograms: string[];
  teachingModes: string[];

  availableDays: string[];
  availableSlots: ProfileSlot[];

  profilePhotoUrl: string;
  demoVideoUrl: string;

  bio: string;
  teachingApproach: string;

  idProofType: string;
  idProofUrl: string;
  qualificationProofUrl: string;

  accountHolderName: string;
  upiId: string;
};

/* =========================================================
   PROFILE CONSTANTS
========================================================= */

const PROFILE_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const PROFILE_BOARDS = [
  "CBSE",
  "ICSE",
  "UP Board",
  "State Board",
];

const PROFILE_GRADES = Array.from(
  { length: 10 },
  (_, index) => `Class ${index + 1}`,
);

const PROFILE_SUBJECTS = [
  "Math",
  "Science",
  "English",
];

const PROFILE_PROGRAMS = [
  "MATH_ONLY",
  "ENGLISH_ONLY",
  "ALL_SUBJECTS",
];

const PROFILE_TEACHING_MODES = [
  "GROUP",
  "INDIVIDUAL",
];

const PROFILE_TIMES = Array.from(
  { length: 16 },
  (_, index) => {
    const hour = String(index + 6).padStart(
      2,
      "0",
    );

    const nextHour = String(
      index + 7,
    ).padStart(
      2,
      "0",
    );

    return [
      `${hour}:00`,
      `${nextHour}:00`,
    ] as const;
  },
);

/* =========================================================
   HELPERS
========================================================= */

function formatProfileTime(
  value: string,
) {
  const [
    hourText,
    minute = "00",
  ] = value.split(":");

  const hour = Number(hourText);

  if (!Number.isFinite(hour)) {
    return value;
  }

  return `${hour % 12 || 12}:${minute} ${
    hour >= 12 ? "PM" : "AM"
  }`;
}

function normalizeDate(
  value?: string,
) {
  if (!value) {
    return null;
  }

  const date = new Date(
    `${value}T00:00:00`,
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date;
}

function parseTimeToMinutes(
  value?: string,
) {
  if (!value) {
    return 0;
  }

  const raw = value
    .trim()
    .toUpperCase();

  const match = raw.match(
    /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/,
  );

  if (!match) {
    return 0;
  }

  let hour = Number(match[1]);

  const minute = Number(
    match[2] || 0,
  );

  const meridiem = match[3];

  if (
    meridiem === "PM" &&
    hour !== 12
  ) {
    hour += 12;
  }

  if (
    meridiem === "AM" &&
    hour === 12
  ) {
    hour = 0;
  }

  return hour * 60 + minute;
}

function getDateTime(
  date?: string,
  time?: string,
) {
  if (!date) {
    return 0;
  }

  const parsedDate =
    normalizeDate(date);

  if (!parsedDate) {
    return 0;
  }

  const minutes =
    parseTimeToMinutes(time);

  parsedDate.setHours(
    Math.floor(
      minutes / 60,
    ),
    minutes % 60,
    0,
    0,
  );

  return parsedDate.getTime();
}

function getTodayDateKey() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      now.getDate(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}`;
}

function formatDate(
  date?: string,
) {
  if (!date) {
    return "Date not available";
  }

  const parsedDate =
    normalizeDate(date);

  if (!parsedDate) {
    return date;
  }

  return parsedDate.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );
}

function formatSubjects(
  subjects?: string[],
  subject?: string,
) {
  if (
    subjects &&
    subjects.length > 0
  ) {
    return subjects.join(" + ");
  }

  if (subject) {
    return subject;
  }

  return "Live Class";
}

function isValidImageSrc(
  src?: string,
) {
  if (!src) {
    return false;
  }

  const value =
    src.trim();

  return (
    value.startsWith("/") ||
    value.startsWith(
      "http://",
    ) ||
    value.startsWith(
      "https://",
    )
  );
}

function statusLabel(
  status?: SessionStatus,
) {
  switch (status) {
    case "LIVE":
      return "LIVE NOW";

    case "OPEN_FOR_JOIN":
      return "READY";

    case "PREPARING":
      return "PREPARING";

    case "PAUSED":
      return "PAUSED";

    case "TECHNICAL_ISSUE":
      return "ISSUE";

    case "ENDED":
      return "ENDED";

    case "COMPLETED":
      return "COMPLETED";

    case "PROCESSING":
      return "PROCESSING";

    case "CANCELLED":
      return "CANCELLED";

    default:
      return "SCHEDULED";
  }
}

function getSessionPriority(
  session: Session,
) {
  switch (session.status) {
    case "LIVE":
      return 0;

    case "OPEN_FOR_JOIN":
      return 1;

    case "PREPARING":
      return 2;

    case "SCHEDULED":
      return 3;

    case "PAUSED":
      return 4;

    case "TECHNICAL_ISSUE":
      return 5;

    case "PROCESSING":
      return 6;

    case "ENDED":
      return 7;

    case "COMPLETED":
      return 8;

    case "CANCELLED":
      return 9;

    default:
      return 10;
  }
}

/* =========================================================
   PAGE
========================================================= */

export default function TeacherDashboardPage() {
  const router = useRouter();

  const [
    teacher,
    setTeacher,
  ] = useState<Teacher | null>(
    null,
  );

  const [
    sessions,
    setSessions,
  ] = useState<Session[]>([]);

  const [
    demos,
    setDemos,
  ] = useState<DemoBooking[]>(
    [],
  );

  const [
    batches,
    setBatches,
  ] = useState<Batch[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    refreshKey,
    setRefreshKey,
  ] = useState(0);

  const [
    openingSessionId,
    setOpeningSessionId,
  ] = useState("");

  const [
    startingDemoId,
    setStartingDemoId,
  ] = useState("");

  const [
    demoActionError,
    setDemoActionError,
  ] = useState<{
    id: string;
    message: string;
  } | null>(null);

  const [
    profileEditing,
    setProfileEditing,
  ] = useState(false);

  const [
    profileSaving,
    setProfileSaving,
  ] = useState(false);

  const [
    profileMessage,
    setProfileMessage,
  ] = useState("");

  const [
    profileScheduleDay,
    setProfileScheduleDay,
  ] = useState(
    "Monday",
  );

  const [
    profileDraft,
    setProfileDraft,
  ] =
    useState<TeacherProfileDraft>({
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
      grades: [],
      subjects: [],

      demoPrograms: [],
      teachingModes: [],

      availableDays: [],
      availableSlots: [],

      profilePhotoUrl: "",
      demoVideoUrl: "",

      bio: "",
      teachingApproach: "",

      idProofType: "Aadhaar",
      idProofUrl: "",
      qualificationProofUrl:
        "",

      accountHolderName: "",
      upiId: "",
    });

  /* =======================================================
     PROFILE
  ======================================================= */

  function openProfileEditor() {
    const slots =
      (
        teacher?.availableSlots ||
        []
      ).map(
        (slot) => ({
          ...slot,

          dayOfWeek:
            slot.dayOfWeek ||
            slot.day ||
            "Monday",
        }),
      );

    const availableDays =
      teacher?.availableDays ||
      [
        ...new Set(
          slots.map(
            (slot) =>
              slot.dayOfWeek ||
              "Monday",
          ),
        ),
      ];

    setProfileDraft({
      name:
        teacher?.name ||
        "",

      email:
        teacher?.email ||
        auth.currentUser
          ?.email ||
        "",

      phone:
        teacher?.phone ||
        "",

      city:
        teacher?.city ||
        "",

      qualification:
        teacher?.qualification ||
        "",

      institution:
        teacher?.institution ||
        "",

      graduationYear:
        teacher?.graduationYear
          ? String(
              teacher.graduationYear,
            )
          : "",

      experienceYears:
        String(
          teacher?.experienceYears ??
            "",
        ),

      experienceDescription:
        teacher?.experienceDescription ||
        "",

      boards:
        teacher?.boards ||
        [],

      grades:
        teacher?.grades ||
        teacher?.classesTaught ||
        [],

      subjects:
        teacher?.subjects ||
        [],

      demoPrograms:
        teacher?.demoPrograms ||
        [],

      teachingModes:
        teacher?.teachingModes ||
        [
          ...(teacher?.groupAvailable
            ? ["GROUP"]
            : []),

          ...(teacher?.individualAvailable
            ? ["INDIVIDUAL"]
            : []),
        ],

      availableDays,

      availableSlots:
        slots,

      profilePhotoUrl:
        teacher?.profilePhotoUrl ||
        "",

      demoVideoUrl:
        teacher?.demoVideoUrl ||
        "",

      bio:
        teacher?.bio ||
        "",

      teachingApproach:
        teacher?.teachingApproach ||
        "",

      idProofType:
        teacher?.kyc
          ?.idProofType ||
        "Aadhaar",

      idProofUrl:
        teacher?.kyc
          ?.idProofUrl ||
        "",

      qualificationProofUrl:
        teacher?.kyc
          ?.qualificationProofUrl ||
        "",

      accountHolderName:
        teacher?.payout
          ?.accountHolderName ||
        "",

      upiId:
        teacher?.payout
          ?.upiId ||
        "",
    });

    setProfileScheduleDay(
      availableDays[0] ||
        slots[0]
          ?.dayOfWeek ||
        "Monday",
    );

    setProfileMessage("");

    setProfileEditing(true);
  }

  function toggleProfileChoice(
    field:
      | "boards"
      | "grades"
      | "subjects"
      | "demoPrograms"
      | "teachingModes"
      | "availableDays",

    value: string,
  ) {
    setProfileDraft(
      (current) => {
        const values =
          current[field];

        const exists =
          values.includes(
            value,
          );

        const nextValues =
          exists
            ? values.filter(
                (item) =>
                  item !== value,
              )
            : [
                ...values,
                value,
              ];

        if (
          field !==
          "availableDays"
        ) {
          return {
            ...current,
            [field]:
              nextValues,
          };
        }

        return {
          ...current,

          availableDays:
            nextValues,

          availableSlots:
            exists
              ? current.availableSlots.filter(
                  (slot) =>
                    (
                      slot.dayOfWeek ||
                      slot.day
                    ) !==
                    value,
                )
              : current.availableSlots,
        };
      },
    );
  }

  function toggleProfileSlot(
    day: string,
    startTime: string,
    endTime: string,
  ) {
    setProfileDraft(
      (current) => {
        const existing =
          current.availableSlots.some(
            (slot) =>
              (
                slot.dayOfWeek ||
                slot.day
              ) === day &&
              slot.startTime ===
                startTime,
          );

        const availableSlots =
          existing
            ? current.availableSlots.filter(
                (slot) =>
                  !(
                    (
                      slot.dayOfWeek ||
                      slot.day
                    ) === day &&
                    slot.startTime ===
                      startTime
                  ),
              )
            : [
                ...current.availableSlots,

                {
                  slotId: `${day.toLowerCase()}_${startTime.replace(
                    ":",
                    "",
                  )}`,

                  dayOfWeek:
                    day,

                  startTime,
                  endTime,

                  isOccupied:
                    false,
                },
              ];

        const hasDaySlots =
          availableSlots.some(
            (slot) =>
              (
                slot.dayOfWeek ||
                slot.day
              ) === day,
          );

        let availableDays =
          current.availableDays;

        if (
          hasDaySlots &&
          !availableDays.includes(
            day,
          )
        ) {
          availableDays = [
            ...availableDays,
            day,
          ];
        }

        return {
          ...current,

          availableSlots,
          availableDays,
        };
      },
    );
  }

  async function saveTeacherProfile(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const user =
      auth.currentUser;

    if (
      !user ||
      profileSaving
    ) {
      return;
    }

    const experienceYears =
      Number(
        profileDraft.experienceYears ||
          0,
      );

    if (
      !profileDraft.name.trim() ||
      !Number.isFinite(
        experienceYears,
      ) ||
      experienceYears < 0 ||
      experienceYears > 60
    ) {
      setProfileMessage(
        "Enter a name and a valid experience value (0–60 years).",
      );

      return;
    }

    if (
      !profileDraft.subjects
        .length ||
      !profileDraft
        .availableDays.length ||
      !profileDraft
        .availableSlots.length
    ) {
      setProfileMessage(
        "Choose at least one subject, available day and time slot.",
      );

      return;
    }

    setProfileSaving(true);
    setProfileMessage("");

    try {
      const updates = {
        name:
          profileDraft.name.trim(),

        email:
          profileDraft.email
            .trim()
            .toLowerCase(),

        phone:
          profileDraft.phone.replace(
            /\D/g,
            "",
          ),

        city:
          profileDraft.city.trim(),

        qualification:
          profileDraft.qualification.trim(),

        institution:
          profileDraft.institution.trim(),

        graduationYear:
          profileDraft.graduationYear
            ? Number(
                profileDraft.graduationYear,
              )
            : null,

        experienceYears,

        experienceDescription:
          profileDraft.experienceDescription.trim(),

        boards:
          profileDraft.boards,

        subjects:
          profileDraft.subjects,

        grades:
          profileDraft.grades,

        classesTaught:
          profileDraft.grades,

        demoPrograms:
          profileDraft.demoPrograms,

        teachingModes:
          profileDraft.teachingModes,

        availableDays:
          profileDraft.availableDays,

        availableSlots:
          profileDraft.availableSlots.map(
            (slot) => ({
              ...slot,

              dayOfWeek:
                slot.dayOfWeek ||
                slot.day ||
                "Monday",
            }),
          ),

        groupAvailable:
          profileDraft.teachingModes.includes(
            "GROUP",
          ),

        individualAvailable:
          profileDraft.teachingModes.includes(
            "INDIVIDUAL",
          ),

        demoVideoUrl:
          profileDraft.demoVideoUrl.trim(),

        profilePhotoUrl:
          profileDraft.profilePhotoUrl.trim(),

        bio:
          profileDraft.bio.trim(),

        teachingApproach:
          profileDraft.teachingApproach.trim(),

        kyc: {
          ...(
            teacher?.kyc ||
            {}
          ),

          idProofType:
            profileDraft.idProofType,

          idProofUrl:
            profileDraft.idProofUrl.trim(),

          qualificationProofUrl:
            profileDraft.qualificationProofUrl.trim(),
        },

        payout: {
          ...(
            teacher?.payout ||
            {}
          ),

          accountHolderName:
            profileDraft.accountHolderName.trim(),

          upiId:
            profileDraft.upiId.trim(),
        },

        updatedAt:
          serverTimestamp(),
      };

      await updateDoc(
        doc(
          db,
          "teachers",
          user.uid,
        ),
        updates,
      );

      setTeacher(
        (current) =>
          current
            ? {
                ...current,
                ...updates,
              }
            : current,
      );

      setProfileEditing(
        false,
      );

      setProfileMessage(
        "Teaching profile saved.",
      );
    } catch (profileError) {
      console.error(
        "Teacher profile update failed:",
        profileError,
      );

      setProfileMessage(
        "Could not save your profile. Please try again.",
      );
    } finally {
      setProfileSaving(
        false,
      );
    }
  }

  /* =======================================================
     ALWAYS OPEN CLASSROOM
  ======================================================= */

  async function openClassroom(
    session: Session,
  ) {
    if (
      !session.id ||
      openingSessionId
    ) {
      return;
    }

    setOpeningSessionId(
      session.id,
    );

    setError("");

    try {
      /*
       * IMPORTANT:
       *
       * Teacher is allowed to reopen any classroom
       * assigned to them.
       *
       * No date restriction.
       * No start-time restriction.
       * No end-time restriction.
       * No COMPLETED restriction.
       * No ENDED restriction.
       */

      if (
        session.status !==
          "LIVE" &&
        session.status !==
          "OPEN_FOR_JOIN"
      ) {
        try {
          await updateDoc(
            doc(
              db,
              "class_sessions",
              session.id,
            ),
            {
              status:
                "OPEN_FOR_JOIN",

              updatedAt:
                serverTimestamp(),

              reopenedByTeacher:
                true,
            },
          );
        } catch (
          updateError
        ) {
          /*
           * Do not block joining merely because
           * status update failed.
           */
          console.warn(
            "Session status could not be updated before join:",
            updateError,
          );
        }
      }

      router.push(
        `/studio/${encodeURIComponent(
          session.id,
        )}`,
      );
    } catch (
      classroomError
    ) {
      console.error(
        "Unable to open classroom:",
        classroomError,
      );

      setError(
        "Could not open the classroom. Please try again.",
      );

      setOpeningSessionId(
        "",
      );
    }
  }

  /* =======================================================
     CREATE DEMO CLASSROOM
  ======================================================= */

  async function startAssignedDemo(
    demo: DemoBooking,
  ) {
    const user =
      auth.currentUser;

    if (
      !user ||
      !demo.batchId ||
      startingDemoId
    ) {
      return;
    }

    setStartingDemoId(
      demo.id,
    );

    setDemoActionError(
      null,
    );

    try {
      const response =
        await fetch(
          "/api/class_sessions/create",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${await user.getIdToken()}`,
            },

            body: JSON.stringify(
              {
                demoBookingId:
                  demo.id,

                batchId:
                  demo.batchId,

                title:
                  `Demo class · ${
                    demo.studentName ||
                    "Student"
                  }`,

                subject:
                  formatSubjects(
                    demo.subjects,
                    demo.subject,
                  ),

                durationMinutes:
                  60,
              },
            ),
          },
        );

      const result =
        await readApiResponse(
          response,
        );

      if (
        !response.ok ||
        !result.success ||
        !result.session?.id
      ) {
        throw new Error(
          result.message ||
            "Could not prepare this demo classroom.",
        );
      }

      router.push(
        `/studio/${encodeURIComponent(
          result.session.id,
        )}`,
      );
    } catch (
      demoError
    ) {
      setDemoActionError({
        id: demo.id,

        message:
          demoError instanceof
          Error
            ? demoError.message
            : "Could not prepare this demo classroom.",
      });

      setStartingDemoId(
        "",
      );
    }
  }

  /* =======================================================
     TEACHER + SESSION + DEMO LISTENERS
  ======================================================= */

  useEffect(() => {
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
            router.replace(
              "/teacher-auth",
            );

            return;
          }

          setLoading(true);
          setError("");

          try {
            const teacherRef =
              doc(
                db,
                "teachers",
                user.uid,
              );

            const teacherSnap =
              await getDoc(
                teacherRef,
              );

            if (
              !teacherSnap.exists()
            ) {
              router.replace(
                "/onboarding/teacher",
              );

              return;
            }

            const teacherData =
              teacherSnap.data() as Teacher;

            setTeacher({
              ...teacherData,
              uid: user.uid,
            });

            const sessionQuery =
              query(
                collection(
                  db,
                  "class_sessions",
                ),

                where(
                  "teacherId",
                  "==",
                  user.uid,
                ),
              );

            unsubscribeSessions =
              onSnapshot(
                sessionQuery,

                (snapshot) => {
                  const rows =
                    snapshot.docs.map(
                      (item) => ({
                        ...(item.data() as Session),

                        id:
                          item.id,
                      }),
                    );

                  setSessions(
                    rows,
                  );

                  setLoading(
                    false,
                  );
                },

                (
                  listenerError,
                ) => {
                  console.error(
                    "Teacher sessions listener error:",
                    listenerError,
                  );

                  setError(
                    "Unable to load your classes right now.",
                  );

                  setLoading(
                    false,
                  );
                },
              );

            const demoQuery =
              query(
                collection(
                  db,
                  "demo_bookings",
                ),

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
                  const rows =
                    snapshot.docs.map(
                      (item) => ({
                        ...(item.data() as DemoBooking),

                        id:
                          item.id,
                      }),
                    );

                  setDemos(
                    rows,
                  );
                },

                (
                  listenerError,
                ) => {
                  console.error(
                    "Teacher demos listener error:",
                    listenerError,
                  );
                },
              );
          } catch (
            dashboardError
          ) {
            console.error(
              "Teacher dashboard error:",
              dashboardError,
            );

            setError(
              "Unable to load dashboard data.",
            );

            setLoading(
              false,
            );
          }
        },
      );

    return () => {
      unsubscribeAuth();

      unsubscribeSessions?.();
      unsubscribeDemos?.();
    };
  }, [
    router,
    refreshKey,
  ]);

  /* =======================================================
     BATCH LISTENER
  ======================================================= */

  useEffect(() => {
    let unsubscribeBatches:
      | (() => void)
      | undefined;

    const authStop =
      onAuthStateChanged(
        auth,
        (user) => {
          unsubscribeBatches?.();

          if (!user) {
            setBatches([]);
            return;
          }

          unsubscribeBatches =
            onSnapshot(
              query(
                collection(
                  db,
                  "batches",
                ),

                where(
                  "teacherId",
                  "==",
                  user.uid,
                ),
              ),

              (snapshot) => {
                setBatches(
                  snapshot.docs.map(
                    (item) => ({
                      ...(item.data() as Omit<
                        Batch,
                        "id"
                      >),

                      id:
                        item.id,
                    }),
                  ),
                );
              },

              () => {
                setError(
                  "Unable to load your current batches. Please refresh.",
                );
              },
            );
        },
      );

    return () => {
      authStop();
      unsubscribeBatches?.();
    };
  }, [refreshKey]);

  /* =======================================================
     DERIVED DATA
  ======================================================= */

  const availableSessions =
    useMemo(() => {
      return [
        ...sessions,
      ]
        .filter(
          (session) =>
            session.status !==
            "CANCELLED",
        )
        .sort(
          (a, b) => {
            const priorityDiff =
              getSessionPriority(
                a,
              ) -
              getSessionPriority(
                b,
              );

            if (
              priorityDiff !==
              0
            ) {
              return priorityDiff;
            }

            return (
              getDateTime(
                b.date,
                b.startTime,
              ) -
              getDateTime(
                a.date,
                a.startTime,
              )
            );
          },
        );
    }, [sessions]);

  const liveSessions =
    useMemo(
      () =>
        availableSessions.filter(
          (session) =>
            session.status ===
            "LIVE",
        ),
      [availableSessions],
    );

  const todaySessions =
    useMemo(() => {
      const today =
        getTodayDateKey();

      return sessions.filter(
        (session) =>
          session.date ===
            today &&
          session.status !==
            "CANCELLED",
      );
    }, [sessions]);

  const visibleDemos =
    useMemo(
      () =>
        demos.filter(
          (demo) =>
            demo.status !==
              "CANCELLED" &&
            demo.demoStatus !==
              "CANCELLED",
        ),
      [demos],
    );

  const visibleBatches =
    useMemo(
      () =>
        batches.filter(
          (batch) =>
            ![
              "CANCELLED",
              "ARCHIVED",
            ].includes(
              batch.status ||
                "",
            ) &&
            batch.type !==
              "DEMO" &&
            !demos.some(
              (demo) =>
                demo.batchId ===
                batch.id,
            ),
        ),
      [
        batches,
        demos,
      ],
    );

  const uniqueStudents =
    useMemo(() => {
      const ids =
        new Set<string>();

      sessions.forEach(
        (session) => {
          session.studentIds?.forEach(
            (studentId) => {
              if (
                studentId
              ) {
                ids.add(
                  studentId,
                );
              }
            },
          );
        },
      );

      demos.forEach(
        (demo) => {
          if (
            demo.studentId
          ) {
            ids.add(
              demo.studentId,
            );
          }
        },
      );

      return ids.size;
    }, [
      sessions,
      demos,
    ]);

  const nextSession =
    liveSessions[0] ||
    availableSessions[0];

  const teacherInitial =
    (
      teacher?.name ||
      "Teacher"
    )
      .trim()
      .charAt(0)
      .toUpperCase();

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f4f7fb]">
        <div className="flex min-h-screen items-center justify-center px-5">
          <div className="w-full max-w-[360px] rounded-[30px] border border-slate-200/80 bg-white px-8 py-10 text-center shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-[20px] bg-gradient-to-br from-indigo-600 to-blue-600 shadow-lg shadow-indigo-200">
              <Loader2
                size={26}
                className="animate-spin text-white"
              />
            </div>

            <p className="mt-5 text-base font-black tracking-tight text-slate-950">
              Preparing your workspace
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-400">
              Loading classrooms,
              batches and booked
              demos.
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-950">
      {/* BACKGROUND */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[430px] w-[430px] rounded-full bg-indigo-100/50 blur-3xl" />

        <div className="absolute right-[-180px] top-[180px] h-[500px] w-[500px] rounded-full bg-sky-100/60 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-[1510px] px-4 py-4 sm:px-6 lg:px-8 lg:py-7">
        {/* NAVIGATION */}

        <nav className="mb-5 flex items-center justify-between rounded-[24px] border border-white/90 bg-white/90 px-4 py-3 shadow-[0_10px_35px_rgba(15,23,42,0.055)] backdrop-blur-xl sm:px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-[15px] bg-gradient-to-br from-indigo-600 via-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-200/80">
              <GraduationCap
                size={22}
              />
            </div>

            <div>
              <p className="text-[15px] font-black tracking-[-0.02em] text-slate-950">
                BlankLearn
              </p>

              <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                Teacher workspace
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-1 rounded-[14px] border border-slate-100 bg-slate-50 p-1 md:flex">
            <span className="inline-flex items-center gap-2 rounded-[10px] bg-white px-3.5 py-2 text-[11px] font-black text-indigo-700 shadow-sm">
              <LayoutDashboard
                size={14}
              />

              Dashboard
            </span>

            <span className="px-3.5 py-2 text-[11px] font-bold text-slate-400">
              Classes
            </span>

            <span className="px-3.5 py-2 text-[11px] font-bold text-slate-400">
              Students
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Refresh dashboard"
              onClick={() =>
                setRefreshKey(
                  (value) =>
                    value +
                    1,
                )
              }
              className="grid h-10 w-10 place-items-center rounded-[13px] border border-slate-200 bg-white text-slate-500 transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md"
            >
              <RefreshCw
                size={16}
              />
            </button>

            <Link
              href="/teacher-settings"
              className="flex items-center gap-2 rounded-[14px] border border-slate-200 bg-white px-2 py-1.5 transition-all hover:border-indigo-200 hover:shadow-md sm:pr-3"
            >
              {isValidImageSrc(
                teacher?.profilePhotoUrl,
              ) ? (
                <img
                  src={
                    teacher!
                      .profilePhotoUrl!
                      .trim()
                  }
                  alt={
                    teacher?.name ||
                    "Teacher"
                  }
                  width={34}
                  height={34}
                  className="h-[34px] w-[34px] rounded-[10px] object-cover"
                />
              ) : (
                <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-indigo-600 text-xs font-black text-white">
                  {
                    teacherInitial
                  }
                </span>
              )}

              <span className="hidden text-left sm:block">
                <span className="block max-w-[130px] truncate text-[11px] font-black text-slate-800">
                  {teacher?.name ||
                    "Teacher"}
                </span>

                <span className="mt-0.5 block text-[9px] font-semibold text-slate-400">
                  Teacher account
                </span>
              </span>
            </Link>
          </div>
        </nav>

        {/* HERO */}

        <header className="relative isolate overflow-hidden rounded-[32px] border border-indigo-950/5 bg-[#101936] shadow-[0_28px_90px_rgba(30,41,90,0.19)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(99,102,241,0.42),transparent_37%),radial-gradient(circle_at_77%_120%,rgba(14,165,233,0.26),transparent_40%)]" />

          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] lg:block">
            <Image
              src="/img1.png"
              alt="Teacher classroom"
              fill
              priority
              sizes="46vw"
              className="object-cover object-center opacity-70"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-[#101936] via-[#101936]/70 to-[#101936]/10" />
          </div>

          <div className="relative z-10 grid min-h-[310px] items-center gap-10 p-6 sm:p-9 lg:grid-cols-[1.05fr_.95fr] lg:p-11">
            <div className="max-w-[650px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-indigo-100 backdrop-blur-xl">
                <Sparkles
                  size={12}
                />

                Teacher command center
              </div>

              <h1 className="mt-5 max-w-xl text-[32px] font-black leading-[1.08] tracking-[-0.04em] text-white sm:text-[44px]">
                Welcome back,{" "}
                {teacher?.name?.split(
                  " ",
                )[0] ||
                  "Teacher"}
                .
              </h1>

              <p className="mt-3 max-w-[570px] text-[13px] leading-6 text-slate-300">
                Your classrooms
                stay accessible.
                Open any assigned
                class whenever you
                need it — no
                waiting for the
                scheduled time.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                {nextSession ? (
                  <button
                    type="button"
                    disabled={
                      Boolean(
                        openingSessionId,
                      )
                    }
                    onClick={() =>
                      void openClassroom(
                        nextSession,
                      )
                    }
                    className="group inline-flex items-center gap-3 rounded-[15px] bg-white px-4 py-3 text-left text-[#111a36] shadow-[0_14px_40px_rgba(0,0,0,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(0,0,0,0.24)] disabled:cursor-wait disabled:opacity-70"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-indigo-600 text-white shadow-md shadow-indigo-200">
                      {openingSessionId ===
                      nextSession.id ? (
                        <Loader2
                          size={
                            14
                          }
                          className="animate-spin"
                        />
                      ) : (
                        <Play
                          size={
                            13
                          }
                          fill="currentColor"
                        />
                      )}
                    </span>

                    <span>
                      <span className="block text-[11px] font-black">
                        {nextSession.status ===
                        "LIVE"
                          ? "Join live classroom"
                          : "Open classroom"}
                      </span>

                      <span className="mt-0.5 block text-[9px] font-semibold text-slate-400">
                        Available
                        anytime
                      </span>
                    </span>

                    <ChevronRight
                      size={15}
                      className="ml-1 transition-transform group-hover:translate-x-1"
                    />
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-[15px] border border-white/15 bg-white/[0.08] px-4 py-3 text-xs font-bold text-slate-200 backdrop-blur">
                    <CheckCircle2
                      size={15}
                    />
                    No classroom
                    assigned yet
                  </span>
                )}

                <button
                  type="button"
                  onClick={
                    openProfileEditor
                  }
                  className="inline-flex items-center gap-2 rounded-[15px] border border-white/15 bg-white/[0.08] px-4 py-3 text-[11px] font-black text-white backdrop-blur-xl transition hover:bg-white/[0.14]"
                >
                  <Pencil
                    size={14}
                  />

                  Edit teaching
                  profile
                </button>
              </div>
            </div>

            <div className="hidden lg:block" />
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/[0.07] bg-black/10 px-6 py-3.5 text-[9px] font-bold text-slate-300 sm:px-9 lg:px-11">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck
                size={13}
                className="text-emerald-400"
              />

              Assigned classes
              always accessible
            </span>

            <span className="hidden h-3 w-px bg-white/15 sm:block" />

            <span>
              Rejoin completed
              classrooms anytime
            </span>

            <span className="hidden h-3 w-px bg-white/15 sm:block" />

            <span>
              Direct classroom
              access
            </span>
          </div>
        </header>

        {/* ERROR */}

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-[18px] border border-rose-200 bg-rose-50 p-4 text-rose-700 shadow-sm">
            <CircleAlert
              size={18}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="text-xs font-black">
                Dashboard warning
              </p>

              <p className="mt-1 text-[11px] leading-5">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* METRICS */}

        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Today's classes"
            value={
              todaySessions.length
            }
            description="Scheduled today"
            icon={
              <CalendarDays
                size={17}
              />
            }
          />

          <StatCard
            label="Live now"
            value={
              liveSessions.length
            }
            description="Currently running"
            icon={
              <Radio
                size={17}
              />
            }
            live={
              liveSessions.length >
              0
            }
          />

          <StatCard
            label="Booked demos"
            value={
              visibleDemos.length
            }
            description="Assigned demos"
            icon={
              <MonitorPlay
                size={17}
              />
            }
          />

          <StatCard
            label="Students"
            value={
              uniqueStudents
            }
            description="Across your classes"
            icon={
              <Users
                size={17}
              />
            }
          />
        </section>

        {/* CONTENT */}

        <div className="mt-9 space-y-11">
          {/* LIVE CLASSES */}

          {liveSessions.length >
            0 && (
            <section>
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />

                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                    </span>

                    <h2 className="text-xl font-black tracking-[-0.025em] text-slate-950 sm:text-2xl">
                      Live now
                    </h2>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Active
                    classrooms you
                    can enter
                    immediately.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {liveSessions.map(
                  (
                    session,
                  ) => (
                    <button
                      key={
                        session.id
                      }
                      type="button"
                      onClick={() =>
                        void openClassroom(
                          session,
                        )
                      }
                      className="group relative overflow-hidden rounded-[26px] border border-rose-100 bg-white p-5 text-left shadow-[0_12px_38px_rgba(15,23,42,0.07)] transition-all hover:-translate-y-1 hover:border-rose-200 hover:shadow-[0_22px_55px_rgba(225,29,72,0.11)] sm:p-6"
                    >
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 via-red-500 to-orange-400" />

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-rose-50 text-rose-600">
                            <Video
                              size={
                                20
                              }
                            />
                          </span>

                          <div className="min-w-0">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-rose-600">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />

                              Live now
                            </span>

                            <h3 className="mt-2 truncate text-base font-black text-slate-950">
                              {session.title ||
                                formatSubjects(
                                  session.subjects,
                                  session.subject,
                                )}
                            </h3>

                            <p className="mt-1 text-[10px] font-semibold text-slate-400">
                              {formatDate(
                                session.date,
                              )}
                              {" · "}
                              {session.startTime ||
                                "Open classroom"}
                            </p>
                          </div>
                        </div>

                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-slate-950 text-white transition group-hover:bg-rose-600">
                          {openingSessionId ===
                          session.id ? (
                            <Loader2
                              size={
                                16
                              }
                              className="animate-spin"
                            />
                          ) : (
                            <Play
                              size={
                                14
                              }
                              fill="currentColor"
                            />
                          )}
                        </span>
                      </div>
                    </button>
                  ),
                )}
              </div>
            </section>
          )}

          {/* DEMOS */}

          <section aria-labelledby="booked-demos">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <div className="flex items-center gap-2">
                  <h2
                    id="booked-demos"
                    className="text-xl font-black tracking-[-0.025em] text-slate-950 sm:text-2xl"
                  >
                    Booked demos
                  </h2>

                  {visibleDemos.length >
                    0 && (
                    <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[9px] font-black text-indigo-700">
                      {
                        visibleDemos.length
                      }
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Click a demo
                  card to enter
                  its classroom
                  directly.
                </p>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-[13px] border border-emerald-100 bg-emerald-50 px-3 py-2 text-[9px] font-black text-emerald-700">
                <ShieldCheck
                  size={13}
                />

                Always available
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {visibleDemos.map(
                (demo) => {
                  const ids =
                    new Set([
                      ...(
                        demo.sessionIds ||
                        []
                      ),

                      ...(
                        demo.demoSessionIds ||
                        []
                      ),

                      ...(
                        demo.sessionId
                          ? [
                              demo.sessionId,
                            ]
                          : []
                      ),
                    ]);

                  const linked =
                    sessions
                      .filter(
                        (
                          session,
                        ) =>
                          ids.has(
                            session.id,
                          ) ||
                          Boolean(
                            demo.batchId &&
                              (
                                session.batchId ===
                                  demo.batchId ||
                                session.demoBatchId ===
                                  demo.batchId
                              ),
                          ),
                      )
                      .filter(
                        (
                          session,
                        ) =>
                          session.status !==
                          "CANCELLED",
                      )
                      .sort(
                        (
                          a,
                          b,
                        ) =>
                          getDateTime(
                            a.date,
                            a.startTime,
                          ) -
                          getDateTime(
                            b.date,
                            b.startTime,
                          ),
                      );

                  /*
                   * ALWAYS choose a classroom:
                   *
                   * LIVE first
                   * READY second
                   * otherwise latest existing session
                   */
                  const classroomSession =
                    linked.find(
                      (
                        session,
                      ) =>
                        session.status ===
                        "LIVE",
                    ) ||
                    linked.find(
                      (
                        session,
                      ) =>
                        session.status ===
                        "OPEN_FOR_JOIN",
                    ) ||
                    linked[
                      linked.length -
                        1
                    ] ||
                    null;

                  const totalDemoDays =
                    Math.max(
                      demo.demoSessionCount ||
                        linked.length ||
                        1,
                      1,
                    );

                  const completedDays =
                    linked.filter(
                      (
                        session,
                      ) =>
                        [
                          "ENDED",
                          "COMPLETED",
                        ].includes(
                          session.status ||
                            "",
                        ),
                    ).length;

                  const progress =
                    Math.min(
                      100,

                      Math.round(
                        (completedDays /
                          totalDemoDays) *
                          100,
                      ),
                    );

                  const handleDemoCardClick =
                    () => {
                      if (
                        startingDemoId ||
                        openingSessionId
                      ) {
                        return;
                      }

                      if (
                        classroomSession
                      ) {
                        void openClassroom(
                          classroomSession,
                        );

                        return;
                      }

                      if (
                        demo.batchId
                      ) {
                        void startAssignedDemo(
                          demo,
                        );
                      }
                    };

                  const canOpen =
                    Boolean(
                      classroomSession ||
                        demo.batchId,
                    );

                  return (
                    <article
                      key={
                        demo.id
                      }
                      onClick={
                        canOpen
                          ? handleDemoCardClick
                          : undefined
                      }
                      className={`group relative overflow-hidden rounded-[28px] border bg-white shadow-[0_12px_38px_rgba(15,23,42,0.055)] transition-all duration-300 ${
                        canOpen
                          ? "cursor-pointer border-indigo-100 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_24px_65px_rgba(79,70,229,0.13)]"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-400" />

                      <div className="p-5 sm:p-6">
                        {/* HEADER */}

                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-indigo-50 text-indigo-600 transition-all group-hover:bg-indigo-600 group-hover:text-white">
                              <Video
                                size={
                                  20
                                }
                              />
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-indigo-700">
                                  Booked
                                  demo
                                </span>

                                {classroomSession?.status ===
                                  "LIVE" && (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[8px] font-black uppercase text-rose-600">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />

                                    LIVE
                                  </span>
                                )}
                              </div>

                              <h3 className="mt-2 truncate text-lg font-black tracking-[-0.02em] text-slate-950">
                                {formatSubjects(
                                  demo.subjects,
                                  demo.subject,
                                )}
                              </h3>
                            </div>
                          </div>

                          <span className="shrink-0 text-[8px] font-bold text-slate-300">
                            #
                            {demo.id
                              .slice(
                                -7,
                              )
                              .toUpperCase()}
                          </span>
                        </div>

                        {/* STUDENT DETAILS */}

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <div className="flex items-center gap-3 rounded-[17px] border border-slate-100 bg-slate-50/80 p-3.5">
                            <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-white text-slate-500 shadow-sm">
                              <UserRound
                                size={
                                  16
                                }
                              />
                            </span>

                            <div className="min-w-0">
                              <p className="truncate text-xs font-black text-slate-800">
                                {demo.studentName ||
                                  "Assigned student"}
                              </p>

                              <p className="mt-0.5 truncate text-[9px] font-semibold text-slate-400">
                                {demo.classNumber
                                  ? `Class ${demo.classNumber}`
                                  : "Class pending"}

                                {" · "}

                                {demo.board ||
                                  "Board pending"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 rounded-[17px] border border-slate-100 bg-slate-50/80 p-3.5">
                            <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-white text-slate-500 shadow-sm">
                              <Users
                                size={
                                  16
                                }
                              />
                            </span>

                            <div>
                              <p className="text-xs font-black text-slate-800">
                                {demo.demoType ===
                                "INDIVIDUAL"
                                  ? "One-to-one"
                                  : "Small group"}
                              </p>

                              <p className="mt-0.5 text-[9px] font-semibold text-slate-400">
                                {
                                  totalDemoDays
                                }{" "}
                                demo{" "}
                                {totalDemoDays ===
                                1
                                  ? "session"
                                  : "sessions"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* PROGRESS */}

                        <div className="mt-5 rounded-[17px] border border-slate-100 bg-white p-4">
                          <div className="mb-2.5 flex items-center justify-between">
                            <p className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">
                              Demo
                              progress
                            </p>

                            <p className="text-[9px] font-black text-slate-600">
                              {
                                completedDays
                              }
                              /
                              {
                                totalDemoDays
                              }{" "}
                              completed
                            </p>
                          </div>

                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-blue-500 transition-all duration-500"
                              style={{
                                width: `${progress}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* DEMO SESSIONS */}

                        <div className="mt-4 space-y-2">
                          {linked.length >
                          0 ? (
                            linked.map(
                              (
                                session,
                                index,
                              ) => {
                                const isOpening =
                                  openingSessionId ===
                                  session.id;

                                const isLive =
                                  session.status ===
                                  "LIVE";

                                return (
                                  <button
                                    key={
                                      session.id
                                    }
                                    type="button"
                                    onClick={(
                                      event,
                                    ) => {
                                      event.stopPropagation();

                                      void openClassroom(
                                        session,
                                      );
                                    }}
                                    className="group/session flex w-full flex-col gap-3 rounded-[17px] border border-slate-100 bg-white p-3.5 text-left transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-[11px] text-[10px] font-black ${
                                          isLive
                                            ? "bg-rose-50 text-rose-600"
                                            : "bg-slate-50 text-slate-500"
                                        }`}
                                      >
                                        {index +
                                          1}
                                      </div>

                                      <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="text-[11px] font-black text-slate-800">
                                            Day{" "}
                                            {index +
                                              1}{" "}
                                            ·{" "}
                                            {formatDate(
                                              session.date,
                                            )}
                                          </p>

                                          <span
                                            className={`rounded-full px-2 py-0.5 text-[7px] font-black uppercase ${
                                              isLive
                                                ? "bg-rose-50 text-rose-600"
                                                : "bg-slate-100 text-slate-500"
                                            }`}
                                          >
                                            {statusLabel(
                                              session.status,
                                            )}
                                          </span>
                                        </div>

                                        <p className="mt-1 flex items-center gap-1.5 text-[9px] font-semibold text-slate-400">
                                          <Clock3
                                            size={
                                              11
                                            }
                                          />

                                          {session.startTime ||
                                            "Anytime"}

                                          {session.endTime
                                            ? ` – ${session.endTime}`
                                            : ""}

                                          {" · IST"}
                                        </p>
                                      </div>
                                    </div>

                                    <span className="inline-flex w-fit items-center justify-center gap-2 rounded-[11px] bg-indigo-50 px-3.5 py-2.5 text-[9px] font-black text-indigo-700 transition group-hover/session:bg-indigo-600 group-hover/session:text-white">
                                      {isOpening ? (
                                        <Loader2
                                          size={
                                            12
                                          }
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <Play
                                          size={
                                            11
                                          }
                                          fill="currentColor"
                                        />
                                      )}

                                      {isLive
                                        ? "Join live"
                                        : "Open again"}
                                    </span>
                                  </button>
                                );
                              },
                            )
                          ) : (
                            <div className="flex items-center gap-2 rounded-[16px] border border-amber-100 bg-amber-50 px-4 py-3 text-[9px] font-bold text-amber-700">
                              <Clock3
                                size={
                                  13
                                }
                              />

                              {formatDate(
                                demo.date,
                              )}

                              {" · "}

                              {demo.startTime ||
                                "Classroom can be started anytime"}
                            </div>
                          )}
                        </div>

                        {/* MAIN CTA */}

                        <div className="mt-5">
                          {canOpen ? (
                            <button
                              type="button"
                              onClick={(
                                event,
                              ) => {
                                event.stopPropagation();

                                handleDemoCardClick();
                              }}
                              disabled={
                                Boolean(
                                  startingDemoId ||
                                    openingSessionId,
                                )
                              }
                              className="flex w-full items-center justify-center gap-2.5 rounded-[15px] bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3.5 text-[10px] font-black text-white shadow-lg shadow-indigo-100 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-wait disabled:opacity-60"
                            >
                              {startingDemoId ===
                                demo.id ||
                              openingSessionId ===
                                classroomSession?.id ? (
                                <Loader2
                                  size={
                                    14
                                  }
                                  className="animate-spin"
                                />
                              ) : (
                                <Play
                                  size={
                                    13
                                  }
                                  fill="currentColor"
                                />
                              )}

                              {startingDemoId ===
                              demo.id
                                ? "Preparing classroom..."
                                : classroomSession?.status ===
                                    "LIVE"
                                  ? "Join live demo"
                                  : classroomSession
                                    ? "Open demo classroom"
                                    : "Start demo classroom"}

                              {startingDemoId !==
                                demo.id && (
                                <ChevronRight
                                  size={
                                    14
                                  }
                                />
                              )}
                            </button>
                          ) : (
                            <div className="rounded-[14px] bg-slate-50 px-4 py-3 text-center text-[9px] font-bold text-slate-400">
                              Classroom
                              information is
                              unavailable.
                            </div>
                          )}

                          {demoActionError?.id ===
                            demo.id && (
                            <p
                              role="alert"
                              className="mt-3 flex items-center gap-2 rounded-[13px] bg-rose-50 px-3 py-2.5 text-[9px] font-bold text-rose-600"
                            >
                              <CircleAlert
                                size={
                                  12
                                }
                              />

                              {
                                demoActionError.message
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
            </div>

            {!visibleDemos.length && (
              <EmptyState
                title="No booked demos"
                description="New demo bookings assigned to you will appear here automatically."
              />
            )}
          </section>

          {/* CURRENT BATCHES */}

          <section aria-labelledby="current-batches">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2
                  id="current-batches"
                  className="text-xl font-black tracking-[-0.025em] text-slate-950 sm:text-2xl"
                >
                  Current batches
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Open any assigned
                  batch classroom
                  whenever required.
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {visibleBatches.map(
                (batch) => {
                  const batchSessions =
                    sessions
                      .filter(
                        (
                          session,
                        ) =>
                          session.batchId ===
                            batch.id &&
                          session.type !==
                            "DEMO" &&
                          session.status !==
                            "CANCELLED",
                      )
                      .sort(
                        (
                          a,
                          b,
                        ) => {
                          if (
                            a.status ===
                              "LIVE" &&
                            b.status !==
                              "LIVE"
                          ) {
                            return -1;
                          }

                          if (
                            b.status ===
                              "LIVE" &&
                            a.status !==
                              "LIVE"
                          ) {
                            return 1;
                          }

                          return (
                            getDateTime(
                              b.date,
                              b.startTime,
                            ) -
                            getDateTime(
                              a.date,
                              a.startTime,
                            )
                          );
                        },
                      );

                  const batchClassroom =
                    batchSessions.find(
                      (
                        session,
                      ) =>
                        session.status ===
                        "LIVE",
                    ) ||
                    batchSessions[0] ||
                    null;

                  const isLive =
                    batchClassroom?.status ===
                    "LIVE";

                  return (
                    <article
                      key={
                        batch.id
                      }
                      onClick={
                        batchClassroom
                          ? () =>
                              void openClassroom(
                                batchClassroom,
                              )
                          : undefined
                      }
                      className={`group relative overflow-hidden rounded-[28px] border bg-white shadow-[0_12px_38px_rgba(15,23,42,0.055)] transition-all duration-300 ${
                        batchClassroom
                          ? "cursor-pointer border-slate-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_22px_55px_rgba(79,70,229,0.11)]"
                          : "border-slate-200"
                      }`}
                    >
                      <div
                        className={`absolute inset-x-0 top-0 h-1 ${
                          isLive
                            ? "bg-gradient-to-r from-rose-500 to-orange-400"
                            : "bg-gradient-to-r from-indigo-600 to-blue-500"
                        }`}
                      />

                      <div className="p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                          <span className="grid h-12 w-12 place-items-center rounded-[16px] bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                            <Users
                              size={
                                20
                              }
                            />
                          </span>

                          {isLive ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-[8px] font-black uppercase tracking-wider text-rose-600">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />

                              Live now
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[8px] font-black uppercase tracking-wider text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                              {batch.status ||
                                "Active"}
                            </span>
                          )}
                        </div>

                        <h3 className="mt-4 text-lg font-black tracking-[-0.02em] text-slate-950">
                          {batch.name ||
                            batch.title ||
                            formatSubjects(
                              batch.subjects,
                              batch.subject,
                            )}
                        </h3>

                        <p className="mt-1 text-[10px] font-semibold text-slate-400">
                          {formatSubjects(
                            batch.subjects,
                            batch.subject,
                          )}

                          {batch.classNumber
                            ? ` · Class ${batch.classNumber}`
                            : ""}

                          {batch.board
                            ? ` · ${batch.board}`
                            : ""}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-[11px] bg-slate-50 px-3 py-2 text-[9px] font-bold text-slate-600">
                            <Users
                              size={
                                12
                              }
                            />

                            {batch
                              .studentIds
                              ?.length ??
                              0}{" "}
                            students
                          </span>

                          <span className="inline-flex items-center gap-1.5 rounded-[11px] bg-slate-50 px-3 py-2 text-[9px] font-bold text-slate-600">
                            <Video
                              size={
                                12
                              }
                            />

                            {
                              batchSessions.length
                            }{" "}
                            classrooms
                          </span>

                          <span className="inline-flex items-center gap-1.5 rounded-[11px] bg-indigo-50 px-3 py-2 text-[9px] font-black text-indigo-700">
                            <ShieldCheck
                              size={
                                12
                              }
                            />

                            Always
                            accessible
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 bg-slate-50/55 px-5 py-4 sm:px-6">
                        {batchClassroom ? (
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-[11px] font-black text-slate-800">
                                  {batchClassroom.title ||
                                    batchClassroom.subject ||
                                    "Live classroom"}
                                </p>

                                <span
                                  className={`rounded-full px-2 py-0.5 text-[7px] font-black uppercase ${
                                    isLive
                                      ? "bg-rose-50 text-rose-600"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  {statusLabel(
                                    batchClassroom.status,
                                  )}
                                </span>
                              </div>

                              <p className="mt-1 flex items-center gap-1.5 text-[9px] font-semibold text-slate-400">
                                <Clock3
                                  size={
                                    11
                                  }
                                />

                                {formatDate(
                                  batchClassroom.date,
                                )}

                                {" · "}

                                {batchClassroom.startTime ||
                                  "Available anytime"}

                                {batchClassroom.endTime
                                  ? ` – ${batchClassroom.endTime}`
                                  : ""}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={(
                                event,
                              ) => {
                                event.stopPropagation();

                                void openClassroom(
                                  batchClassroom,
                                );
                              }}
                              className={`inline-flex items-center justify-center gap-2 rounded-[12px] px-4 py-3 text-[9px] font-black text-white transition ${
                                isLive
                                  ? "bg-rose-600 hover:bg-rose-700"
                                  : "bg-slate-950 hover:bg-indigo-600"
                              }`}
                            >
                              {openingSessionId ===
                              batchClassroom.id ? (
                                <Loader2
                                  size={
                                    12
                                  }
                                  className="animate-spin"
                                />
                              ) : (
                                <Play
                                  size={
                                    11
                                  }
                                  fill="currentColor"
                                />
                              )}

                              {isLive
                                ? "Join live class"
                                : "Open classroom"}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400">
                            <Clock3
                              size={
                                13
                              }
                            />

                            No classroom
                            created for
                            this batch
                            yet.
                          </div>
                        )}
                      </div>
                    </article>
                  );
                },
              )}
            </div>

            {!visibleBatches.length && (
              <EmptyState
                title="No current batches"
                description="Your assigned teaching batches will appear here automatically."
              />
            )}
          </section>

          {/* ALL CLASSROOMS */}

          {availableSessions.length >
            0 && (
            <section>
              <div className="mb-4">
                <h2 className="text-xl font-black tracking-[-0.025em] text-slate-950 sm:text-2xl">
                  Classroom history
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Every assigned
                  classroom remains
                  available to you,
                  including completed
                  classes.
                </p>
              </div>

              <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_12px_38px_rgba(15,23,42,0.045)]">
                {availableSessions
                  .slice(
                    0,
                    12,
                  )
                  .map(
                    (
                      session,
                      index,
                    ) => (
                      <button
                        key={
                          session.id
                        }
                        type="button"
                        onClick={() =>
                          void openClassroom(
                            session,
                          )
                        }
                        className={`group flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-indigo-50/45 sm:px-6 ${
                          index !==
                          Math.min(
                            availableSessions.length,
                            12,
                          ) -
                            1
                            ? "border-b border-slate-100"
                            : ""
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${
                              session.status ===
                              "LIVE"
                                ? "bg-rose-50 text-rose-600"
                                : "bg-indigo-50 text-indigo-600"
                            }`}
                          >
                            <Video
                              size={
                                16
                              }
                            />
                          </span>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-[11px] font-black text-slate-800">
                                {session.title ||
                                  formatSubjects(
                                    session.subjects,
                                    session.subject,
                                  )}
                              </p>

                              <span
                                className={`rounded-full px-2 py-0.5 text-[7px] font-black uppercase ${
                                  session.status ===
                                  "LIVE"
                                    ? "bg-rose-50 text-rose-600"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {statusLabel(
                                  session.status,
                                )}
                              </span>
                            </div>

                            <p className="mt-1 truncate text-[9px] font-semibold text-slate-400">
                              {formatDate(
                                session.date,
                              )}

                              {" · "}

                              {session.startTime ||
                                "Anytime"}

                              {session.className
                                ? ` · ${session.className}`
                                : ""}
                            </p>
                          </div>
                        </div>

                        <span className="inline-flex shrink-0 items-center gap-2 rounded-[11px] bg-slate-50 px-3 py-2 text-[9px] font-black text-slate-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                          {openingSessionId ===
                          session.id ? (
                            <Loader2
                              size={
                                11
                              }
                              className="animate-spin"
                            />
                          ) : (
                            <Play
                              size={
                                10
                              }
                              fill="currentColor"
                            />
                          )}

                          Open
                        </span>
                      </button>
                    ),
                  )}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ===================================================
          PROFILE EDITOR
      =================================================== */}

      {profileEditing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-5">
          <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-t-[30px] bg-white shadow-2xl sm:rounded-[30px]">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur-xl sm:px-7">
              <div>
                <p className="text-sm font-black text-slate-950">
                  Teaching profile
                </p>

                <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                  Update your
                  teaching details,
                  availability and
                  preferences.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setProfileEditing(
                    false,
                  )
                }
                className="grid h-9 w-9 place-items-center rounded-[12px] bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              >
                <X
                  size={17}
                />
              </button>
            </div>

            <form
              onSubmit={
                saveTeacherProfile
              }
              className="space-y-7 p-5 sm:p-7"
            >
              {/* BASIC */}

              <ProfileSection
                title="Basic information"
                description="Your personal and professional teaching details."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    [
                      "Name",
                      "name",
                      "text",
                    ],

                    [
                      "Email",
                      "email",
                      "email",
                    ],

                    [
                      "Phone",
                      "phone",
                      "tel",
                    ],

                    [
                      "City",
                      "city",
                      "text",
                    ],

                    [
                      "Qualification",
                      "qualification",
                      "text",
                    ],

                    [
                      "Institution",
                      "institution",
                      "text",
                    ],

                    [
                      "Graduation year",
                      "graduationYear",
                      "number",
                    ],

                    [
                      "Experience (years)",
                      "experienceYears",
                      "number",
                    ],
                  ].map(
                    ([
                      label,
                      field,
                      type,
                    ]) => (
                      <label
                        key={
                          field
                        }
                        className="block"
                      >
                        <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">
                          {
                            label
                          }
                        </span>

                        <input
                          type={
                            type
                          }
                          value={String(
                            profileDraft[
                              field as keyof TeacherProfileDraft
                            ] ??
                              "",
                          )}
                          onChange={(
                            event,
                          ) =>
                            setProfileDraft(
                              (
                                current,
                              ) => ({
                                ...current,

                                [field]:
                                  event
                                    .target
                                    .value,
                              }),
                            )
                          }
                          className="w-full rounded-[13px] border border-slate-200 bg-white px-3.5 py-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                        />
                      </label>
                    ),
                  )}
                </div>
              </ProfileSection>

              {/* BOARDS */}

              <ProfileSection
                title="Boards"
                description="Select the boards you can teach."
              >
                <ChoiceGroup
                  values={
                    PROFILE_BOARDS
                  }
                  selected={
                    profileDraft.boards
                  }
                  onToggle={(
                    value,
                  ) =>
                    toggleProfileChoice(
                      "boards",
                      value,
                    )
                  }
                />
              </ProfileSection>

              {/* GRADES */}

              <ProfileSection
                title="Grades"
                description="Classes you are comfortable teaching."
              >
                <ChoiceGroup
                  values={
                    PROFILE_GRADES
                  }
                  selected={
                    profileDraft.grades
                  }
                  onToggle={(
                    value,
                  ) =>
                    toggleProfileChoice(
                      "grades",
                      value,
                    )
                  }
                />
              </ProfileSection>

              {/* SUBJECTS */}

              <ProfileSection
                title="Subjects"
                description="Subjects available on your teacher profile."
              >
                <ChoiceGroup
                  values={
                    PROFILE_SUBJECTS
                  }
                  selected={
                    profileDraft.subjects
                  }
                  onToggle={(
                    value,
                  ) =>
                    toggleProfileChoice(
                      "subjects",
                      value,
                    )
                  }
                />
              </ProfileSection>

              {/* PROGRAMS */}

              <ProfileSection
                title="Demo programs"
                description="Programs you can handle for demo bookings."
              >
                <ChoiceGroup
                  values={
                    PROFILE_PROGRAMS
                  }
                  selected={
                    profileDraft.demoPrograms
                  }
                  onToggle={(
                    value,
                  ) =>
                    toggleProfileChoice(
                      "demoPrograms",
                      value,
                    )
                  }
                />
              </ProfileSection>

              {/* MODES */}

              <ProfileSection
                title="Teaching modes"
                description="Choose group, individual or both."
              >
                <ChoiceGroup
                  values={
                    PROFILE_TEACHING_MODES
                  }
                  selected={
                    profileDraft.teachingModes
                  }
                  onToggle={(
                    value,
                  ) =>
                    toggleProfileChoice(
                      "teachingModes",
                      value,
                    )
                  }
                />
              </ProfileSection>

              {/* DAYS */}

              <ProfileSection
                title="Available days"
                description="Days on which students can be assigned."
              >
                <div className="flex flex-wrap gap-2">
                  {PROFILE_DAYS.map(
                    (day) => {
                      const selected =
                        profileDraft.availableDays.includes(
                          day,
                        );

                      return (
                        <button
                          key={
                            day
                          }
                          type="button"
                          onClick={() => {
                            toggleProfileChoice(
                              "availableDays",
                              day,
                            );

                            setProfileScheduleDay(
                              day,
                            );
                          }}
                          className={`rounded-[11px] border px-3 py-2.5 text-[9px] font-black transition ${
                            selected
                              ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                              : "border-slate-200 bg-white text-slate-500 hover:border-indigo-200"
                          }`}
                        >
                          {selected && (
                            <Check
                              size={
                                11
                              }
                              className="mr-1 inline"
                            />
                          )}

                          {day.slice(
                            0,
                            3,
                          )}
                        </button>
                      );
                    },
                  )}
                </div>
              </ProfileSection>

              {/* TIME */}

              <ProfileSection
                title="Available time slots"
                description="Choose all hours when you can accept classes."
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-black text-slate-800">
                    {
                      profileScheduleDay
                    }
                  </p>

                  <select
                    value={
                      profileScheduleDay
                    }
                    onChange={(
                      event,
                    ) =>
                      setProfileScheduleDay(
                        event
                          .target
                          .value,
                      )
                    }
                    className="rounded-[11px] border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-700 outline-none"
                  >
                    {PROFILE_DAYS.map(
                      (day) => (
                        <option
                          key={
                            day
                          }
                          value={
                            day
                          }
                        >
                          {
                            day
                          }
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {PROFILE_TIMES.map(
                    ([
                      startTime,
                      endTime,
                    ]) => {
                      const selected =
                        profileDraft.availableSlots.some(
                          (
                            slot,
                          ) =>
                            (
                              slot.dayOfWeek ||
                              slot.day
                            ) ===
                              profileScheduleDay &&
                            slot.startTime ===
                              startTime,
                        );

                      return (
                        <button
                          key={`${profileScheduleDay}-${startTime}`}
                          type="button"
                          onClick={() =>
                            toggleProfileSlot(
                              profileScheduleDay,
                              startTime,
                              endTime,
                            )
                          }
                          className={`rounded-[11px] border px-2 py-2.5 text-[9px] font-bold transition ${
                            selected
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-slate-200 bg-white text-slate-500 hover:border-indigo-200"
                          }`}
                        >
                          {formatProfileTime(
                            startTime,
                          )}
                        </button>
                      );
                    },
                  )}
                </div>
              </ProfileSection>

              {/* DESCRIPTION */}

              <ProfileSection
                title="Teaching profile"
                description="Information visible on your teaching profile."
              >
                <div className="grid gap-4">
                  <label>
                    <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">
                      Bio
                    </span>

                    <textarea
                      rows={3}
                      value={
                        profileDraft.bio
                      }
                      onChange={(
                        event,
                      ) =>
                        setProfileDraft(
                          (
                            current,
                          ) => ({
                            ...current,

                            bio:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className="w-full resize-none rounded-[13px] border border-slate-200 px-3.5 py-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">
                      Teaching
                      approach
                    </span>

                    <textarea
                      rows={3}
                      value={
                        profileDraft.teachingApproach
                      }
                      onChange={(
                        event,
                      ) =>
                        setProfileDraft(
                          (
                            current,
                          ) => ({
                            ...current,

                            teachingApproach:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className="w-full resize-none rounded-[13px] border border-slate-200 px-3.5 py-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label>
                      <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">
                        Profile
                        photo URL
                      </span>

                      <input
                        value={
                          profileDraft.profilePhotoUrl
                        }
                        onChange={(
                          event,
                        ) =>
                          setProfileDraft(
                            (
                              current,
                            ) => ({
                              ...current,

                              profilePhotoUrl:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        className="w-full rounded-[13px] border border-slate-200 px-3.5 py-3 text-xs font-semibold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                      />
                    </label>

                    <label>
                      <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">
                        Demo video
                        URL
                      </span>

                      <input
                        value={
                          profileDraft.demoVideoUrl
                        }
                        onChange={(
                          event,
                        ) =>
                          setProfileDraft(
                            (
                              current,
                            ) => ({
                              ...current,

                              demoVideoUrl:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        className="w-full rounded-[13px] border border-slate-200 px-3.5 py-3 text-xs font-semibold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                      />
                    </label>
                  </div>
                </div>
              </ProfileSection>

              {/* SAVE MESSAGE */}

              {profileMessage && (
                <p className="rounded-[14px] bg-slate-50 px-4 py-3 text-[10px] font-bold text-slate-600">
                  {
                    profileMessage
                  }
                </p>
              )}

              {/* ACTIONS */}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() =>
                    setProfileEditing(
                      false,
                    )
                  }
                  className="rounded-[12px] border border-slate-200 px-4 py-3 text-[10px] font-black text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    profileSaving
                  }
                  className="inline-flex items-center gap-2 rounded-[12px] bg-indigo-600 px-5 py-3 text-[10px] font-black text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  {profileSaving ? (
                    <Loader2
                      size={13}
                      className="animate-spin"
                    />
                  ) : (
                    <Save
                      size={13}
                    />
                  )}

                  Save profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function StatCard({
  label,
  value,
  description,
  icon,
  live = false,
}: {
  label: string;
  value: number | string;
  description: string;
  icon: React.ReactNode;
  live?: boolean;
}) {
  return (
    <div className="group rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-[0_7px_25px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-md sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">
          {label}
        </span>

        <span
          className={`grid h-9 w-9 place-items-center rounded-[11px] transition ${
            live
              ? "bg-rose-50 text-rose-600"
              : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100"
          }`}
        >
          {icon}
        </span>
      </div>

      <div className="mt-3 flex items-end gap-2">
        <p className="text-[26px] font-black leading-none tracking-[-0.04em] text-slate-950">
          {value}
        </p>

        {live && (
          <span className="mb-0.5 inline-flex items-center gap-1 text-[8px] font-black uppercase text-rose-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
            Live
          </span>
        )}
      </div>

      <p className="mt-2 text-[9px] font-medium text-slate-400">
        {description}
      </p>
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
    <div className="rounded-[26px] border border-dashed border-slate-200 bg-white/60 px-6 py-12 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-[15px] bg-slate-100 text-slate-300">
        <CalendarDays
          size={21}
        />
      </div>

      <h3 className="mt-4 text-sm font-black text-slate-800">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-[10px] leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function ProfileSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[20px] border border-slate-100 bg-slate-50/45 p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="text-xs font-black text-slate-900">
          {title}
        </h3>

        <p className="mt-1 text-[9px] leading-4 text-slate-400">
          {description}
        </p>
      </div>

      {children}
    </section>
  );
}

function ChoiceGroup({
  values,
  selected,
  onToggle,
}: {
  values: string[];
  selected: string[];
  onToggle: (
    value: string,
  ) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map(
        (value) => {
          const active =
            selected.includes(
              value,
            );

          return (
            <button
              key={value}
              type="button"
              onClick={() =>
                onToggle(
                  value,
                )
              }
              className={`rounded-[11px] border px-3.5 py-2.5 text-[9px] font-black transition ${
                active
                  ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200"
              }`}
            >
              {active && (
                <Check
                  size={11}
                  className="mr-1 inline"
                />
              )}

              {value
                .replaceAll(
                  "_",
                  " ",
                )
                .toLowerCase()
                .replace(
                  /\b\w/g,
                  (letter) =>
                    letter.toUpperCase(),
                )}
            </button>
          );
        },
      )}
    </div>
  );
}