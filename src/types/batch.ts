import type { BoardId } from "@/lib/config/boards";
import type { ClassNumber } from "@/lib/config/classes";
import type { DemoProgramId } from "@/lib/config/demoPrograms";
import type { TimeSlotId } from "@/lib/config/timeSlots";
import type { DemoType } from "./booking";

export type DemoBatchStatus =
  | "OPEN"
  | "FULL"
  | "STARTED"
  | "COMPLETED"
  | "CANCELLED";

export interface DemoBatch {
  id: string;

  teacherId: string;

  classNumber: ClassNumber;
  board: BoardId;

  programId: DemoProgramId;

  demoType: DemoType;

  date: string;
  slotId: TimeSlotId;

  startTime: string;
  endTime: string;

  capacity: number;
  enrolledCount: number;

  studentIds: string[];

  status: DemoBatchStatus;

  createdAt: unknown;
  updatedAt: unknown;
}