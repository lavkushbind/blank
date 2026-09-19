"use client";

import React, { useState } from "react";
import { Check, Clock, Save, ShieldCheck } from "lucide-react";

export default function TeacherSettingsPage() {
  const [hourlyRate, setHourlyRate] = useState("650");
  const [bio, setBio] = useState("B.Tech IIT Delhi graduate with 7+ years of teaching experience. Passionate about algebra & real-world physics.");
  const [selectedSlots, setSelectedSlots] = useState<string[]>([
    "05:00 PM - 06:00 PM",
    "06:15 PM - 07:15 PM",
    "07:30 PM - 08:30 PM",
  ]);
  const [saved, setSaved] = useState(false);

  const allAvailableSlots = [
    "04:00 PM - 05:00 PM",
    "05:00 PM - 06:00 PM",
    "06:15 PM - 07:15 PM",
    "07:30 PM - 08:30 PM",
    "08:45 PM - 09:45 PM",
  ];

  const toggleSlot = (s: string) => {
    setSelectedSlots((prev) =>
      prev.includes(s) ? prev.filter((slot) => slot !== s) : [...prev, s]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-black text-slate-950">Mentor Profile & Availability Settings</h1>
        <p className="text-xs text-slate-500">Configure your daily 1-hour slots for 1:5 micro-batches and bio.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        {/* Availability Slots */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">Daily 1-Hour Teaching Slots Available</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {allAvailableSlots.map((slot) => {
              const active = selectedSlots.includes(slot);
              return (
                <div
                  key={slot}
                  onClick={() => toggleSlot(slot)}
                  className={`p-3 rounded-xl border text-xs font-bold cursor-pointer transition flex items-center justify-between ${
                    active ? "bg-indigo-50 border-indigo-600 text-indigo-950 shadow-sm" : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span className="flex items-center gap-1.5"><Clock size={13} /> {slot}</span>
                  {active && <Check size={14} className="text-indigo-600" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Earning Payout Rate */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Completed 1:5 Class Payout Rate (Fixed by Platform)</label>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">₹</span>
            <input
              type="text"
              disabled
              value={hourlyRate}
              className="w-36 text-xs font-black p-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-800"
            />
            <span className="text-xs text-slate-500">/ 60-min completed pod session</span>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Mentor Bio (Shown on Teacher Directory)</label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        <button
          type="submit"
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2"
        >
          <Save size={14} /> {saved ? "Changes Saved ✓" : "Save Availability"}
        </button>
      </form>
    </div>
  );
}