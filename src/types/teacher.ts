import { UserProfile } from "./student";

export interface TeacherProfile extends UserProfile {
  role: "TEACHER";
  kycStatus: "PENDING" | "VERIFIED" | "REJECTED";
  aadhaarUrl?: string;
  degreeUrl?: string;
  demoVideoUrl?: string;
  subjects: string[];
  grades: number[]; // e.g. [6, 7, 8]
  hourlyRate: number;
  availableSlots: string[]; // e.g. ["17:00-18:00", "18:00-19:00"]
  walletBalance: number;
}

export interface BatchPod {
  id: string;
  name: string;
  grade: number;
  subject: string;
  teacherId: string;
  studentIds: string[]; // Strict limit: Max 5
  timeSlot: string;
  createdAt: number;
  isActive: boolean;
}
