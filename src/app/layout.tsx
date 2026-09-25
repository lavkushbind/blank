import { MarketingAnalytics } from "@/components/MarketingAnalytics";
﻿import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BlankLearn • India's First 1:5 Micro-Batch Online Tuition (CBSE & ICSE)",
  description: "Strictly 1 Teacher & 5 Students. In-Browser ML Attention Tracking, Mandatory Post-Class Voice Remarks, and 100% Parent Transparency.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className="bg-slate-50 text-slate-900 min-h-screen selection:bg-indigo-100 selection:text-indigo-900">
        {children}
        <MarketingAnalytics/>
      </body>
    </html>
  );
}