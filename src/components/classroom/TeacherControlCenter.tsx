"use client";

import React, { useState } from "react";
import { MicOff, Sparkles, CheckSquare, ListCheck, Shield } from "lucide-react";

export default function TeacherControlCenter({ sessionId }: { sessionId: string }) {
  const [showAgenda, setShowAgenda] = useState(false);
  const [agenda, setAgenda] = useState([
    { text: "Recap: Equality Rules", done: true },
    { text: "Solve Exercise 4.2 (Q1 to Q5)", done: true },
    { text: "Live Whiteboard Poll #1", done: false },
    { text: "Doubt Clearance & Homework Assignment", done: false },
  ]);

  const toggleAgendaItem = (idx: number) => {
    const updated = [...agenda];
    updated[idx].done = !updated[idx].done;
    setAgenda(updated);
  };

  const handleMuteAll = () => {
    alert("Triggered 'Mute All' signal across all 5 student audio tracks.");
  };

  return (
    <div className="flex items-center gap-2">
      {/* Mute All Button */}
      <button
        onClick={handleMuteAll}
        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 flex items-center gap-1.5 transition"
      >
        <MicOff size={13} /> Mute All Students
      </button>

      {/* Lesson Agenda Drawer Toggle */}
      <button
        onClick={() => setShowAgenda(!showAgenda)}
        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition shadow-sm"
      >
        <ListCheck size={13} className="text-indigo-600" /> Lesson Agenda
      </button>

      {/* Agenda Popover */}
      {showAgenda && (
        <div className="absolute top-16 right-40 z-40 bg-white border border-slate-200 p-5 rounded-3xl shadow-2xl w-80 space-y-3 animate-in fade-in">
          <div className="flex justify-between items-center border-b pb-2">
            <h4 className="text-xs font-black text-slate-900">Today's Class Agenda</h4>
            <button onClick={() => setShowAgenda(false)} className="text-slate-400 hover:text-slate-800 text-xs font-bold">✕</button>
          </div>
          <div className="space-y-2">
            {agenda.map((item, i) => (
              <div
                key={i}
                onClick={() => toggleAgendaItem(i)}
                className={`p-2 rounded-xl border text-xs cursor-pointer flex items-center gap-2 ${
                  item.done ? "bg-emerald-50 border-emerald-200 text-emerald-900 line-through" : "bg-slate-50 border-slate-200 text-slate-800 font-medium"
                }`}
              >
                <CheckSquare size={14} className={item.done ? "text-emerald-600" : "text-slate-400"} />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}