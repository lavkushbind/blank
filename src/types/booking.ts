import type { BoardId } from "@/lib/config/boards";
import type { ClassNumber } from "@/lib/config/classes";
import type { DemoProgramId } from "@/lib/config/demoPrograms";
import type { SubjectId } from "@/lib/config/subjects";
import type { TimeSlotId } from "@/lib/config/timeSlots";

export type DemoType = "GROUP" | "INDIVIDUAL";

export type DemoBookingStatus =
  | "PENDING"
  | "PAYMENT_PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "EXPIRED";

export type PaymentStatus =
  | "NOT_REQUIRED"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED";

export interface DemoBookingRequest {
  studentId?: string;
  parentId?: string;

  studentName: string;

  classNumber: ClassNumber;
  board: BoardId;

  programId: DemoProgramId;

  demoType: DemoType;

  date: string;
  slotId: TimeSlotId;

  email?: string;
  phone?: string;

  couponCode?: string;
}

export interface DemoBooking {
  id: string;

  studentId?: string;
  parentId?: string;

  studentName: string;

  classNumber: ClassNumber;
  board: BoardId;

  programId: DemoProgramId;

  subjects: SubjectId[];

  demoType: DemoType;

  date: string;
  slotId: TimeSlotId;

  startTime: string;
  endTime: string;

  teacherId?: string;
  batchId?: string;

  status: DemoBookingStatus;

  paymentStatus: PaymentStatus;

  originalPrice: number;
  discount: number;
  finalPrice: number;

  currency: "INR";

  createdAt: unknown;
  updatedAt: unknown;
}