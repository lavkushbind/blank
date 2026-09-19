export type UserRole = "TEACHER" | "STUDENT" | "PARENT" | "ADMIN";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  role: UserRole;
  photoURL?: string;
  createdAt: number;
}
