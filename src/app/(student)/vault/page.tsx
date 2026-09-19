"use client";

import React, { useState } from "react";
import { Play, Pause, Download, Calendar, Clock, BookOpen, ChevronRight } from "lucide-react";

export default function StudentVaultPage() {
  const recordings = [
    {
      id: "rec_01",
      topic: "Linear Equations & Graph Plotting",
      date: "18 September 2026",
      duration: "58 mins",
      teacher: "Rahul Sharma Sir (IIT Delhi)",
      videoPreview: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=900",
      chapters: [
        { time: "00:00", title: "Introduction & Rules of Equality" },
        { time: "14:20", title: "Variables on Both Sides (Step-by-Step)" },
        { time: "35:10", title: "Live Whiteboard Student Problem Solutions" },
        { time: "48:00", title: "5-Minute Quiz Discussion" },
      ],
    },
    {
      id: "rec_02",
      topic: "Introduction to Algebraic Polynomials",
      date: "15 September 2026",
      duration: "61 mins",
      teacher: "Rahul Sharma Sir (IIT Delhi)",
      videoPreview: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=900",
      chapters: [
        { time: "00:00", title: "Monomials vs Binomials" },
        { time: "22:00", title: "Degree of Polynomials" },
        { time: "45:30", title: "Common Sign Mistakes in Exams" },
      ],
    },
  ];

  const [activeRec, setActiveRec] = useState(recordings[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(activeRec.chapters[0].title);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-950">Classroom Recordings Vault</h1>
        <p className="text-xs text-slate-500">Watch past 1:5 live sessions with chapter bookmarks and download whiteboard notes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Main Interactive Video Player Stage (8 Cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm space-y-4">
          <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden group">
            <img
              src={activeRec.videoPreview}
              alt="Video Preview"
              className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition duration-300"
            />
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="absolute w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-2xl transition group-hover:scale-110"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            </button>
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-xs text-white bg-black/60 backdrop-blur px-4 py-2 rounded-xl">
              <span className="font-bold">Topic: {currentChapter}</span>
              <span className="font-mono">58:00 Full Session</span>
            </div>
          </div>

          <div className="p-6 pt-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-950">{activeRec.topic}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mentor: {activeRec.teacher} • Recorded on {activeRec.date}
                </p>
              </div>
              <button
                onClick={() => alert("Downloading High-Res Teacher Whiteboard Notes (PDF)...")}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
              >
                <Download size={14} /> Download Notes PDF
              </button>
            </div>

            {/* Chapter Bookmarks List */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Chapter Bookmarks:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeRec.chapters.map((ch, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setCurrentChapter(ch.title); setIsPlaying(true); }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition ${
                      currentChapter === ch.title
                        ? "bg-indigo-50 border-indigo-600 text-indigo-950 font-bold"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <span className="truncate pr-2">{ch.title}</span>
                    <span className="font-mono text-[10px] text-slate-500 shrink-0 font-bold">{ch.time}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Past Sessions Library (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-sm font-black text-slate-900">Recorded Sessions Library</h3>
          <div className="space-y-3">
            {recordings.map((rec) => (
              <div
                key={rec.id}
                onClick={() => { setActiveRec(rec); setCurrentChapter(rec.chapters[0].title); setIsPlaying(false); }}
                className={`p-4 rounded-2xl border cursor-pointer transition space-y-2 ${
                  activeRec.id === rec.id
                    ? "bg-white border-indigo-600 shadow-md shadow-indigo-100"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <h4 className="text-xs font-black text-slate-900">{rec.topic}</h4>
                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <span>{rec.date}</span>
                  <span className="font-bold text-indigo-600">{rec.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}