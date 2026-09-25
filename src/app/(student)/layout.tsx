"use client";

import React from "react";
import hubStyles from "./hub/hub.module.css";
import { usePathname } from "next/navigation";
import { Award, BookOpen, CalendarDays, Compass, Home, MessageCircle, Settings, UserRound, FileText } from "lucide-react";
import { WorkspaceShell, type WorkspaceLink } from "@/components/workspace/WorkspaceShell";

const links: WorkspaceLink[] = [
  { href: "/hub", label: "Home", icon: Home },
  { href: "/classes", label: "My Classes", icon: CalendarDays },
  { href: "/explore", label: "Explore Classes", icon: Compass },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/homework", label: "Homework", icon: FileText },
  { href: "/vault", label: "Class Vault", icon: BookOpen },
  { href: "/badges", label: "Badges", icon: Award },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/classroom/")) return <div className="min-h-screen bg-[#080b12] text-white">{children}</div>;
  return <div className={pathname === "/hub" ? hubStyles.shell : undefined}><WorkspaceShell role="student" links={links} searchHref="/explore" settingsHref="/settings" exitHref="/student-auth" exitLabel="Exit">{children}</WorkspaceShell></div>;
}
