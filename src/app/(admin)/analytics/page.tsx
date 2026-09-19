"use client";

import React from "react";
import { TrendingUp, Users, DollarSign, Award } from "lucide-react";

export default function AdminAnalyticsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-black text-slate-950">Commercial Growth Funnel</h1>
        <p className="text-xs text-slate-500">Live conversion funnel from website visitors to monthly pod renewals.</p>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Monthly Revenue (MRR)", val: "₹18,45,000", sub: "+24% from last month" },
          { label: "Demo Conversion Rate", val: "37.5%", sub: "Industry average: 18%" },
          { label: "Monthly Retention", val: "93.3%", sub: "High 1:5 Pod loyalty" },
          { label: "Customer Acquisition (CAC)", val: "₹840", sub: "LTV: ₹10,500 (12.5x ROI)" },
        ].map((kpi, i) => (
          <div key={i} className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-500">{kpi.label}</span>
            <p className="text-2xl font-black text-slate-950 font-mono">{kpi.val}</p>
            <p className="text-[11px] text-emerald-700 font-bold">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Conversion Funnel Waterfall */}
      <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6">
        <h3 className="text-base font-black text-slate-950">End-to-End Business Funnel Waterfall</h3>

        <div className="space-y-4">
          {[
            { step: "1. Website Unique Visitors", count: "100,000", drop: "100%", width: "w-full", color: "bg-indigo-600" },
            { step: "2. Student / Parent Signups", count: "8,000", drop: "8.0%", width: "w-4/5", color: "bg-indigo-500" },
            { step: "3. 1:5 Free Demos Booked", count: "1,200", drop: "15.0%", width: "w-3/5", color: "bg-indigo-400" },
            { step: "4. Demos Attended with Camera ON", count: "800", drop: "66.7%", width: "w-2/5", color: "bg-emerald-600" },
            { step: "5. Paid 1:5 Pod Subscriptions", count: "300", drop: "37.5%", width: "w-1/4", color: "bg-emerald-500" },
            { step: "6. Second Month Renewals (Retention)", count: "280", drop: "93.3%", width: "w-1/5", color: "bg-emerald-400" },
          ].map((fn, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-800">{fn.step}</span>
                <span className="font-mono text-slate-900">{fn.count} ({fn.drop})</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div className={`${fn.color} ${fn.width} h-3 rounded-full`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}