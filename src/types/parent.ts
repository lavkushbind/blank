import { UserProfile } from "./student";

export interface ParentProfile extends UserProfile {
  role: "PARENT";
  childrenIds: string[]; // Linked students
  activeSubscriptions: Subscription[];
}

export interface Subscription {
  id: string;
  childId: string;
  batchId: string;
  status: "ACTIVE" | "EXPIRED" | "GRACE_PERIOD";
  expiresAt: number;
  planType: "MONTHLY" | "QUARTERLY" | "ANNUAL";
}
