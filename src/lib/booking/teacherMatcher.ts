import type { BoardId } from "@/lib/config/boards";
import type { DemoProgramId } from "@/lib/config/demoPrograms";
import type { TimeSlotId } from "@/lib/config/timeSlots";

export type CanonicalSubject =
  | "MATH"
  | "SCIENCE"
  | "ENGLISH";

export type CanonicalDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface TeacherAvailability {
  day: CanonicalDay;
  slotId: TimeSlotId;
  startTime: string;
  endTime: string;
}

export interface TeacherRecord {
  id: string;

  name?: string | null;
  email?: string | null;

  active?: boolean;

  applicationStatus?: string;
  kycStatus?: string;

  boards?: unknown[];
  classes?: unknown[];
  classesTaught?: unknown[];
  grades?: unknown[];

  subjects?: unknown[];
  demoPrograms?: unknown[];
  teachingModes?: unknown[];

  availableDays?: unknown[];
  availableSlots?: unknown[];
  timeSlots?: unknown[];

  groupAvailable?: boolean;
  individualAvailable?: boolean;
  maxGroupSize?: number;

  experienceYears?: number;
  rating?: number;
}

export interface NormalizedTeacher {
  id: string;
  name: string;

  active: boolean;

  applicationStatus: string;
  kycStatus: string;

  boards: BoardId[];

  classes: number[];

  subjects: CanonicalSubject[];

  demoPrograms: DemoProgramId[];

  teachingModes: Array<"GROUP" | "INDIVIDUAL">;

  availableSlots: TeacherAvailability[];

  groupAvailable: boolean;
  individualAvailable: boolean;

  maxGroupSize: number;

  experienceYears: number;
  rating: number;
}

export interface MatchRequest {
  classNumber: number;
  board: BoardId;
  programId: DemoProgramId;
  demoType: "GROUP" | "INDIVIDUAL";
  date: string;
  slotId: TimeSlotId;
}

export interface ExistingBatch {
  id: string;

  teacherId: string;

  classNumber: number;
  board: BoardId;
  programId: DemoProgramId;

  demoType: "GROUP" | "INDIVIDUAL";

  date: string;
  slotId: TimeSlotId;

  capacity: number;
  enrolledCount: number;

  status: string;
}

export interface TeacherMatch {
  teacher: NormalizedTeacher;

  score: number;

  existingBatch: ExistingBatch | null;

  reasons: string[];
}

/* ========================================================================== */
/* NORMALIZATION                                                              */
/* ========================================================================== */

function clean(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function normalizeBoard(value: unknown): BoardId | null {
  const v = clean(value);

  if (v === "CBSE") return "CBSE";
  if (v === "ICSE") return "ICSE";

  if (
    v === "STATE" ||
    v === "STATE BOARD" ||
    v === "UP BOARD"
  ) {
    return "STATE";
  }

  if (
    v === "OTHER" ||
    v === "OTHER BOARD"
  ) {
    return "OTHER";
  }

  return null;
}

function normalizeClass(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? value
      : null;
  }

  const text = String(value ?? "")
    .trim()
    .toLowerCase();

  const match = text.match(/\d+/);

  if (!match) return null;

  const number = Number(match[0]);

  return number >= 1 && number <= 10
    ? number
    : null;
}

function normalizeSubject(
  value: unknown,
): CanonicalSubject | null {
  const v = clean(value);

  if (
    v === "MATH" ||
    v === "MATHEMATICS" ||
    v === "MATHS"
  ) {
    return "MATH";
  }

  if (v === "SCIENCE") {
    return "SCIENCE";
  }

  if (v === "ENGLISH") {
    return "ENGLISH";
  }

  return null;
}

function normalizeProgram(
  value: unknown,
): DemoProgramId | null {
  const v = clean(value);

  if (
    v === "MATH_ONLY" ||
    v === "MATH"
  ) {
    return "MATH_ONLY";
  }

  if (
    v === "ENGLISH_ONLY" ||
    v === "ENGLISH"
  ) {
    return "ENGLISH_ONLY";
  }

  if (
    v === "COMBO" ||
    v === "ALL_SUBJECTS" ||
    v === "MATH_SCIENCE_ENGLISH" ||
    v === "MATH + SCIENCE + ENGLISH"
  ) {
    return "ALL_SUBJECTS";
  }

  return null;
}

function normalizeMode(
  value: unknown,
): "GROUP" | "INDIVIDUAL" | null {
  const v = clean(value);

  if (v === "GROUP") return "GROUP";
  if (v === "INDIVIDUAL") return "INDIVIDUAL";

  return null;
}

function normalizeDay(
  value: unknown,
): CanonicalDay | null {
  const v = clean(value);

  const days: Record<
    string,
    CanonicalDay
  > = {
    MONDAY: "MONDAY",
    TUESDAY: "TUESDAY",
    WEDNESDAY: "WEDNESDAY",
    THURSDAY: "THURSDAY",
    FRIDAY: "FRIDAY",
    SATURDAY: "SATURDAY",
    SUNDAY: "SUNDAY",
  };

  return days[v] ?? null;
}

function getDayFromDate(
  date: string,
): CanonicalDay {
  const d = new Date(
    `${date}T00:00:00Z`,
  );

  const days: CanonicalDay[] = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];

  return days[d.getUTCDay()];
}

/* ========================================================================== */
/* SLOT NORMALIZATION                                                         */
/* ========================================================================== */

function hourToSlot(
  hour: number,
): TimeSlotId | null {
  const slots: Record<
    number,
    TimeSlotId
  > = {
    15: "15_16",
    16: "16_17",
    17: "17_18",
    18: "18_19",
    19: "19_20",
    20: "20_21",
  };

  return slots[hour] ?? null;
}

function parseTimeToHour(
  value: unknown,
): number | null {
  if (!value) return null;

  const text = String(value)
    .trim()
    .toUpperCase();

  const match = text.match(
    /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/,
  );

  if (!match) return null;

  let hour = Number(match[1]);
  const modifier = match[3];

  if (modifier === "PM" && hour < 12) {
    hour += 12;
  }

  if (modifier === "AM" && hour === 12) {
    hour = 0;
  }

  return hour;
}

function normalizeSlot(
  raw: any,
  fallbackDay?: CanonicalDay,
): TeacherAvailability | null {
  const rawSlotId = String(
    raw?.slotId ?? "",
  );

  /*
   * New format:
   * 18_19
   */
  if (/^(15|16|17|18|19|20)_/.test(rawSlotId)) {
    const [start, end] =
      rawSlotId.split("_");

    const startHour = Number(start);

    const slot = hourToSlot(startHour);

    if (!slot) return null;

    return {
      day:
        normalizeDay(
          raw?.day ??
            raw?.dayOfWeek ??
            fallbackDay,
        ) ?? "MONDAY",

      slotId: slot,

      startTime:
        raw?.startTime ??
        `${startHour}:00`,

      endTime:
        raw?.endTime ??
        `${Number(end)}:00`,
    };
  }

  /*
   * Existing teacher format:
   * Monday-18:00
   */
  const match =
    rawSlotId.match(
      /^([A-Za-z]+)-(\d{1,2})(?::(\d{2}))?/,
    );

  if (match) {
    const day =
      normalizeDay(match[1]);

    const hour =
      Number(match[2]);

    const slot =
      hourToSlot(hour);

    if (!day || !slot) {
      return null;
    }

    return {
      day,
      slotId: slot,
      startTime:
        raw?.startTime ??
        `${String(hour).padStart(2, "0")}:00`,
      endTime:
        raw?.endTime ??
        `${String(hour + 1).padStart(2, "0")}:00`,
    };
  }

  /*
   * Explicit start/end time.
   */
  const startHour =
    parseTimeToHour(
      raw?.startTime,
    );

  if (
    startHour !== null
  ) {
    const slot =
      hourToSlot(startHour);

    if (!slot) return null;

    const day =
      normalizeDay(
        raw?.day ??
          raw?.dayOfWeek ??
          fallbackDay,
      );

    if (!day) return null;

    return {
      day,
      slotId: slot,
      startTime:
        raw?.startTime,
      endTime:
        raw?.endTime,
    };
  }

  return null;
}

/* ========================================================================== */
/* TEACHER NORMALIZER                                                         */
/* ========================================================================== */

export function normalizeTeacher(
  raw: TeacherRecord,
): NormalizedTeacher {
  const rawClasses = [
    ...(raw.classes ?? []),
    ...(raw.classesTaught ?? []),
    ...(raw.grades ?? []),
  ];

  const classes = Array.from(
    new Set(
      rawClasses
        .map(normalizeClass)
        .filter(
          (
            value,
          ): value is number =>
            value !== null,
        ),
    ),
  );

  const rawSubjects = [
    ...(raw.subjects ?? []),
  ];

  const subjects = Array.from(
    new Set(
      rawSubjects
        .map(normalizeSubject)
        .filter(
          (
            value,
          ): value is CanonicalSubject =>
            value !== null,
        ),
    ),
  );

  const rawPrograms = [
    ...(raw.demoPrograms ?? []),
  ];

  const demoPrograms =
    Array.from(
      new Set(
        rawPrograms
          .map(normalizeProgram)
          .filter(
            (
              value,
            ): value is DemoProgramId =>
              value !== null,
          ),
      ),
    );

  const rawModes = [
    ...(raw.teachingModes ?? []),
  ];

  const teachingModes =
    Array.from(
      new Set(
        rawModes
          .map(normalizeMode)
          .filter(
            (
              value,
            ): value is
              | "GROUP"
              | "INDIVIDUAL" =>
              value !== null,
          ),
      ),
    );

  const boards =
    Array.from(
      new Set(
        (raw.boards ?? [])
          .map(normalizeBoard)
          .filter(
            (
              value,
            ): value is BoardId =>
              value !== null,
          ),
      ),
    );

  const fallbackDays =
    (raw.availableDays ?? [])
      .map(normalizeDay)
      .filter(
        (
          value,
        ): value is CanonicalDay =>
          value !== null,
      );

  const availableSlots =
    [...(raw.availableSlots ?? []), ...(raw.timeSlots ?? [])]
      .flatMap(slot => (fallbackDays.length ? fallbackDays : [undefined]).map(day => normalizeSlot(typeof slot === "string" ? { slotId: slot, startTime: slot } : slot, day)))
      .filter(
        (
          value,
        ): value is TeacherAvailability =>
          value !== null,
      );

  /*
   * If teacher has day but no explicit slot,
   * don't invent availability.
   */

  const nestedKycStatus =
    (
      raw as any
    )?.kyc?.status;

  const kycStatus =
    clean(
      raw.kycStatus ??
        nestedKycStatus,
    ) || "PENDING";

  return {
    id: raw.id,

    name:
      raw.name?.trim() ||
      "BlankLearn Mentor",

    active:
      raw.active !== false,

    applicationStatus:
      clean(
        raw.applicationStatus,
      ) || "PENDING",

    kycStatus,

    boards,

    classes,

    subjects,

    demoPrograms,

    teachingModes,

    availableSlots,

    groupAvailable:
      raw.groupAvailable === true ||
      teachingModes.includes(
        "GROUP",
      ),

    individualAvailable:
      raw.individualAvailable === true ||
      teachingModes.includes(
        "INDIVIDUAL",
      ),

    maxGroupSize:
      Number(
        raw.maxGroupSize ?? 5,
      ),

    experienceYears:
      Number(
        raw.experienceYears ?? 0,
      ),

    rating:
      Number(
        raw.rating ?? 0,
      ),
  };
}

/* ========================================================================== */
/* PROGRAM SUBJECTS                                                           */
/* ========================================================================== */

function requiredSubjects(
  programId: DemoProgramId,
): CanonicalSubject[] {
  switch (programId) {
    case "MATH_ONLY":
      return ["MATH"];

    case "ENGLISH_ONLY":
      return ["ENGLISH"];

    case "ALL_SUBJECTS":
      return [
        "MATH",
        "SCIENCE",
        "ENGLISH",
      ];
  }
}

/* ========================================================================== */
/* MATCHER                                                                    */
/* ========================================================================== */

export function findMatchingTeachers(
  request: MatchRequest,
  teachers: TeacherRecord[],
  existingBatches: ExistingBatch[] = [],
): TeacherMatch[] {
  const day =
    getDayFromDate(
      request.date,
    );

  const required =
    requiredSubjects(
      request.programId,
    );

  const matches: TeacherMatch[] =
    [];

  for (const rawTeacher of teachers) {
    const teacher =
      normalizeTeacher(
        rawTeacher,
      );

    const reasons: string[] =
      [];

    /*
     * HARD ELIGIBILITY
     */

    if (!teacher.active) {
      continue;
    }

    if (
      ![
        "APPROVED",
        "VERIFIED",
      ].includes(
        teacher.applicationStatus,
      )
    ) {
      continue;
    }

    /*
     * KYC is mandatory for real allocation.
     */
    if (
      ![
        "VERIFIED",
        "APPROVED",
      ].includes(
        teacher.kycStatus,
      )
    ) {
      continue;
    }

    if (
      !teacher.classes.includes(
        request.classNumber,
      )
    ) {
      continue;
    }

    if (
      !teacher.boards.includes(
        request.board,
      )
    ) {
      continue;
    }

    /*
     * Program can match either directly
     * or through subject capability.
     */
    const programDirect =
      teacher.demoPrograms.includes(
        request.programId,
      );

    const subjectMatch =
      required.every(subject =>
        teacher.subjects.includes(
          subject,
        ),
      );

    if (
      !subjectMatch
    ) {
      continue;
    }

    if (
      request.demoType ===
      "GROUP"
    ) {
      if (
        !teacher.groupAvailable
      ) {
        continue;
      }

      if (
        teacher.maxGroupSize < 5
      ) {
        continue;
      }
    }

    if (
      request.demoType ===
      "INDIVIDUAL"
    ) {
      if (
        !teacher.individualAvailable
      ) {
        continue;
      }
    }

    if (
      !teacher.teachingModes.includes(
        request.demoType,
      )
    ) {
      continue;
    }

    const matchingSlot =
      teacher.availableSlots.find(
        item =>
          item.day === day &&
          item.slotId ===
            request.slotId,
      );

    if (!matchingSlot) {
      continue;
    }

    /*
     * Find existing compatible batch.
     */
    const existingBatch =
      existingBatches.find(
        batch =>
          batch.teacherId ===
            teacher.id &&
          batch.classNumber ===
            request.classNumber &&
          batch.board ===
            request.board &&
          batch.programId ===
            request.programId &&
          batch.demoType ===
            request.demoType &&
          batch.date ===
            request.date &&
          batch.slotId ===
            request.slotId &&
          !["FULL", "CANCELLED", "INACTIVE", "COMPLETED"].includes(batch.status.toUpperCase()) &&
          batch.enrolledCount <
            batch.capacity,
      ) ?? null;

    /*
     * SCORING
     */
    let score = 0;

    if (programDirect) {
      score += 30;
    } else {
      score += 20;
    }

    score += 25; // class
    score += 25; // board
    score += 25; // date + slot

    if (existingBatch) {
      score += 50;
      reasons.push(
        "Existing compatible batch",
      );
    } else {
      score += 10;
      reasons.push(
        "New compatible batch",
      );
    }

    score += Math.min(
      teacher.experienceYears,
      10,
    );

    score += Math.min(
      teacher.rating,
      10,
    );

    matches.push({
      teacher,
      score,
      existingBatch,
      reasons,
    });
  }

  return matches.sort(
    (a, b) =>
      b.score - a.score,
  );
}

/** Convert the existing regular-batch shape to the matcher's slot schema. */
export function normalizeExistingBatchForRequest(
  id: string,
  raw: Record<string, unknown>,
  request: MatchRequest,
): ExistingBatch | null {
  const date = String(raw.date ?? "").slice(0, 10);
  const requestedDay = getDayFromDate(request.date);
  const rawDays = [raw.day, raw.dayOfWeek, ...(Array.isArray(raw.days) ? raw.days : [])]
    .map(normalizeDay)
    .filter((day): day is CanonicalDay => day !== null);

  if (date && date !== request.date && !rawDays.includes(requestedDay)) return null;
  if (!date && rawDays.length && !rawDays.includes(requestedDay)) return null;

  let normalizedSlot = normalizeSlot(
    { slotId: raw.slotId, startTime: raw.startTime, endTime: raw.endTime },
    requestedDay,
  );

  if (!normalizedSlot) {
    const timeText = String(raw.timeSlot ?? raw.schedule ?? "");
    const times = timeText.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/gi) ?? [];
    const start = parseTimeToHour(raw.startTime ?? times[0]);
    const end = parseTimeToHour(raw.endTime ?? times[1]);
    const requestedSlotHour = Number(request.slotId.split("_")[0]);

    if (
      start !== null &&
      end !== null &&
      start <= requestedSlotHour &&
      end >= requestedSlotHour + 1
    ) {
      normalizedSlot = {
        day: requestedDay,
        slotId: request.slotId,
        startTime: String(raw.startTime ?? `${start}:00`),
        endTime: String(raw.endTime ?? `${end}:00`),
      };
    }
  }

  if (!normalizedSlot || normalizedSlot.slotId !== request.slotId) return null;

  const classNumber = normalizeClass(raw.classNumber ?? raw.grade ?? raw.className);
  const board = normalizeBoard(raw.board);
  if (classNumber === null || board === null) return null;

  const subjects = [
    ...(Array.isArray(raw.subjects) ? raw.subjects : []),
    ...(raw.subject ? [raw.subject] : []),
  ]
    .map(normalizeSubject)
    .filter((subject): subject is CanonicalSubject => subject !== null);
  const inferredProgram = subjects.includes("MATH") && subjects.includes("SCIENCE") && subjects.includes("ENGLISH")
    ? "ALL_SUBJECTS"
    : subjects.includes("MATH")
      ? "MATH_ONLY"
      : subjects.includes("ENGLISH")
        ? "ENGLISH_ONLY"
        : null;
  const programId = normalizeProgram(raw.programId ?? raw.planType) ?? inferredProgram;
  if (!programId) return null;

  const capacity = Math.min(5, Math.max(1, Number(raw.capacity ?? raw.maxStudents ?? 5)));
  const studentIds = Array.isArray(raw.studentIds) ? raw.studentIds : [];
  const enrolledCount = Math.max(Number(raw.enrolledCount ?? 0), studentIds.length);
  const demoType = normalizeMode(raw.demoType) ?? (capacity === 1 ? "INDIVIDUAL" : "GROUP");

  return {
    id,
    teacherId: String(raw.teacherId ?? raw.teacherUid ?? ""),
    classNumber,
    board,
    programId,
    demoType,
    date: request.date,
    slotId: request.slotId,
    capacity,
    enrolledCount,
    status: raw.isActive === false ? "INACTIVE" : String(raw.status ?? "OPEN").toUpperCase(),
  };
}
