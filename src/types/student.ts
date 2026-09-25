export interface UserProfile {
  uid: string;
  name: string;
  email: string;

  phone?: string;
  photoURL?: string;

  role?: "STUDENT" | "PARENT" | "TEACHER" | "ADMIN";

  createdAt?: unknown;
  updatedAt?: unknown;
}