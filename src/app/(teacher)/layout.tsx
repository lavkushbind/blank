"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, CircleDollarSign, ClipboardCheck, GraduationCap, LayoutDashboard, MessageSquareText, Settings, Users } from "lucide-react";
import { WorkspaceShell, type WorkspaceLink } from "@/components/workspace/WorkspaceShell";

const links: WorkspaceLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/batches", label: "My Batches", icon: Users },
  { href: "/batch-requests", label: "Batch Requests", icon: MessageSquareText },
  { href: "/review-homework", label: "Review Homework", icon: ClipboardCheck },
  { href: "/teacher-settings", label: "Availability", icon: CalendarDays },
  { href: "/wallet", label: "Earnings", icon: CircleDollarSign },
  { href: "/accreditation", label: "Profile & Verification", icon: GraduationCap },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/studio/")) return <div className="min-h-screen bg-[#080b12] text-white">{children}</div>;
  return <WorkspaceShell role="teacher" links={links} searchHref="/batches" settingsHref="/teacher-settings" exitHref="/teacher-auth" exitLabel="Logout">{children}</WorkspaceShell>;
}
