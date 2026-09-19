"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase/client";
import { collection, query, getDocs, doc, updateDoc } from "firebase/firestore";
import { CheckCircle2, FileText, Check } from "lucide-react";

export default function TeacherHomeworkReviewPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [marks, setMarks] = useState("9");
  const [feedback, setFeedback] = useState("Accurate calculation steps! Keep it up.");
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);

  useEffect(() => {
    async function fetchSubmissions() {
      try {
        setLoading(true);
        const snap = await getDocs(collection(db, "submissions"));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setSubmissions(list);
        if (list.length > 0) setSelectedSub(list[0]);
      } catch (err) {
        console.error("Error fetching submissions", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSubmissions();
  }, []);

  const handleGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;

    try {
      setGrading(true);
      await updateDoc(doc(db, "submissions", selectedSub.id), {
        marksObtained: Number(marks),
        teacherFeedback: feedback,
        status: "GRADED",
      });

      // Update local state
      setSubmissions(prev => prev.map(s => s.id === selectedSub.id ? {
        ...s,
        marksObtained: Number(marks),
        teacherFeedback: feedback,
        status: "GRADED"
      } : s));

      alert(`Score of ${marks}/10 submitted for ${selectedSub.studentName}. Document updated in Firestore.`);
    } catch (err) {
      console.error("Error grading submission:", err);
    } finally {
      setGrading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-950">Homework Evaluation Desk</h1>
        <p className="text-xs text-slate-500">Evaluate real student solution copies from Firestore.</p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Querying submissions from database...</div>
      ) : submissions.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 rounded-3xl text-center space-y-2 max-w-md mx-auto">
          <FileText size={28} className="text-slate-400 mx-auto" />
          <h3 className="text-sm font-black text-slate-900">No Submissions Pending Review</h3>
          <p className="text-xs text-slate-500">When students submit solutions from their portal, copies will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Submissions Queue */}
          <div className="md:col-span-5 space-y-2.5">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                onClick={() => setSelectedSub(sub)}
                className={`p-4 rounded-2xl border cursor-pointer transition space-y-1 ${
                  selectedSub?.id === sub.id
                    ? "bg-indigo-50 border-indigo-600 text-indigo-950 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-black">{sub.studentName}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                    sub.status === "GRADED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {sub.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{sub.taskTitle}</p>
              </div>
            ))}
          </div>

          {/* Grading Desk */}
          {selectedSub && (
            <div className="md:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">Solution: {selectedSub.studentName}</h3>
                <span className="text-xs font-bold text-slate-500">{selectedSub.taskTitle}</span>
              </div>

              {/* Student Content */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono whitespace-pre-wrap text-slate-800 leading-relaxed">
                {selectedSub.contentNotes || "No written notes attached."}
              </div>

              <form onSubmit={handleGrade} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Score (out of 10)</label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      required
                      value={marks}
                      onChange={(e) => setMarks(e.target.value)}
                      className="w-full text-xs font-black p-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Teacher Feedback</label>
                    <input
                      type="text"
                      required
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={grading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                >
                  {grading ? "Updating Firestore..." : "Submit Score & Feedback to Student →"}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}