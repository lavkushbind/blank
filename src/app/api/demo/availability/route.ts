import {
  NextRequest,
  NextResponse,
} from "next/server";

import { adminDb } from "@/lib/firebase/admin";

import {
  findMatchingTeachers,
  normalizeTeacher,
  normalizeExistingBatchForRequest,
  type TeacherRecord,
  type ExistingBatch,
} from "@/lib/booking/teacherMatcher";

import type {
  BoardId,
} from "@/lib/config/boards";

import type {
  DemoProgramId,
} from "@/lib/config/demoPrograms";

import type {
  TimeSlotId,
} from "@/lib/config/timeSlots";

import {
  TIME_SLOTS,
} from "@/lib/config/timeSlots";

const MAX_DAYS = 14;

function addDays(
  date: string,
  days: number,
) {
  const d =
    new Date(
      `${date}T00:00:00Z`,
    );

  d.setUTCDate(
    d.getUTCDate() +
      days,
  );

  return d
    .toISOString()
    .slice(0, 10);
}

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      await request.json();

    const classNumber =
      Number(
        body.classNumber,
      );

    const board =
      body.board as BoardId;

    const programId =
      body.programId as DemoProgramId;

    const demoType =
      body.demoType as
        | "GROUP"
        | "INDIVIDUAL";

    const fromDate =
      body.date as string;

    const teacherSnapshot =
      await adminDb
        .collection(
          "teachers",
        )
        .get();

    const teachers: TeacherRecord[] =
      teacherSnapshot.docs.map(
        doc => ({
          id: doc.id,
          ...(doc.data() as any),
        }),
      );

    const regularBatchSnapshot = await adminDb
      .collection("batches")
      .get();

    const suggestions: any[] =
      [];

    for (
      let day = 0;
      day < MAX_DAYS;
      day++
    ) {
      const date =
        addDays(
          fromDate,
          day,
        );

      for (
        const slot of TIME_SLOTS
      ) {
        const matchRequest = {
          classNumber,
          board,
          programId,
          demoType,
          date,
          slotId: slot.id,
        };
        const batches: ExistingBatch[] = regularBatchSnapshot.docs
          .map((batchDoc) => normalizeExistingBatchForRequest(
            batchDoc.id,
            batchDoc.data(),
            matchRequest,
          ))
          .filter((batch): batch is ExistingBatch => batch !== null);

        const matches =
          findMatchingTeachers(
            {
              classNumber,
              board,
              programId,
              demoType,
              date,
              slotId:
                slot.id,
            },
            teachers,
            batches,
          );

        if (
          matches.length === 0
        ) {
          continue;
        }

        /*
         * Don't expose private teacher data.
         */
        suggestions.push({
          date,

          slotId:
            slot.id,

          startTime:
            slot.startTime,

          endTime:
            slot.endTime,

          label:
            slot.label,

          availableTeachers:
            matches.length,

          hasExistingBatch:
            matches.some(
              match =>
                !!match.existingBatch,
            ),
        });

        /*
         * Keep response small.
         */
        if (
          suggestions.length >=
          10
        ) {
          break;
        }
      }

      if (
        suggestions.length >=
        10
      ) {
        break;
      }
    }

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (error: any) {
    console.error(
      "[DEMO_AVAILABILITY]",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to find available slots.",
      },
      { status: 500 },
    );
  }
}
