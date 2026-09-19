"use client";

import { useState, useEffect } from "react";

export type UserRole = "STUDENT" | "TEACHER" | "PARENT" | "ADMIN";

export interface CurrentUser {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  isLoggedIn: boolean;
}

export function useUserSession() {
  const [user, setUser] = useState<CurrentUser>({
    uid: "usr_mock_01",
    name: "Aarav Sharma",
    email: "aarav@example.com",
    role: "STUDENT",
    isLoggedIn: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Read session cookies
    if (typeof document !== "undefined") {
      const matchRole = document.cookie.match(/user_role=([^;]+)/);
      if (matchRole && matchRole[1]) {
        const detectedRole = matchRole[1] as UserRole;
        setUser((prev) => ({
          ...prev,
          role: detectedRole,
          name: detectedRole === "TEACHER" ? "Rahul Sharma Sir" : detectedRole === "PARENT" ? "Mr. Rajesh Sharma" : "Aarav Sharma",
        }));
      }
    }
  }, []);

  return { user, loading };
}