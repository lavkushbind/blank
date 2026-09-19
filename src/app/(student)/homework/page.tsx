"use client";

import React, { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase/client";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { UploadCloud, CheckCircle2, Clock, FileText, Camera } from "lucide-react";

export default function StudentHomeworkPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [taskTitle, setTaskTitle] = useState("Chapter 4 Exercise 4.2 Solutions");
  const [notesText, setNotesText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    async function loadSubmissions() {
      try {
        const studentUid = user ? user.uid : "std_current";
        const q = query(collection(db, "submissions"), where("studentId", "==", studentUid));
        const snap = await getDocs(q);
        setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error loading submissions:", err);
      }
    }
    loadSubmissions();
  }, [user, submittedSuccess]);

  const handleSubmitCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesText.trim()) return;

    try {
      setSubmitting(true);
      const studentUid = user ? user.uid : "std_current";
      const studentName = user?.displayName || "Student";

      await addDoc(collection(db, "submissions"), {
        studentId: studentUid,
        studentName,
        taskTitle,
        contentNotes: notesText,
        status: "PENDING",
        submittedAt: serverTimestamp(),
      });

      setSubmittedSuccess(true);
      setNotesText("");
    } catch (err) {
      console.error("Submission error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-950">Student Homework Desk</h1>
        <p className="text-xs text-slate-500">Submit your solved handwritten steps directly to your batch mentor.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Upload Form */}
        <div className="md:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
          <h3 className="text-sm font-black text-slate-900">Submit Homework Task</h3>

          <form onSubmit={handleSubmitCopy} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Homework Task Title</label>
              <input
                type="text"
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Handwritten Notebook Solutions / Calculation Steps
              </label>
              <textarea
                rows={5}
                required
                placeholder="Type your final calculated steps or attach solution notes (e.g. Q1: 2x+5=15 -> x=5)..."
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                className="w-full text-xs font-mono p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition"
            >
              {submitting ? "Saving to Database..." : "Submit Homework to Mentor →"}
            </button>
          </form>
        </div>

        {/* Real Past Submissions from Firestore */}
        <div className="md:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-900">Your Submissions ({submissions.length})</h3>

          {submissions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No homework submissions recorded yet.</div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => (
                <div key={sub.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-xs">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-900">{sub.taskTitle}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                      sub.status === "GRADED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {sub.status}
                    </span>
                  </div>
                  {sub.marksObtained !== undefined && (
                    <div className="text-emerald-700 font-bold font-mono">
                      Score: {sub.marksObtained}/10 Marks
                    </div>
                  )}
                  {sub.teacherFeedback && (
                    <p className="text-slate-600 italic text-[11px]">"{sub.teacherFeedback}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}