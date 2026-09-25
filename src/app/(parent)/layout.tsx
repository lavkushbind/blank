"use client";

import React from "react";

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="min-h-screen">
        {children}
      </main>
    </div>
  );
}