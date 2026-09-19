"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase/client";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ArrowRight, ArrowLeft, Sparkles, Check, CheckCircle2 } from "lucide-react";

export default function StudentOnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isMatching, setIsMatching] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    userType: "Student",
    grade: "Class 7",
    board: "CBSE",
    subjects: ["Mathematics"],
    goal: "Concept clarity",
    timeSlot: "Evening (5:00 PM - 7:00 PM)",
    classType: "1:5 Micro-Batch",
  });

  const handleNext = async () => {
    if (step < 8) {
      setStep(step + 1);
    } else {
      setIsMatching(true);
      try {
        // Write Real Student Record to Firestore Waitlist for Admin Matchmaking
        await addDoc(collection(db, "waitlist"), {
          name: formData.name || "Student",
          grade: formData.grade,
          board: formData.board,
          subjects: formData.subjects,
          goal: formData.goal,
          timeSlot: formData.timeSlot,
          status: "PENDING",
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("Waitlist write error:", err);
      }

      setTimeout(() => {
        router.push("/hub");
      }, 2000);
    }
  };

  const toggleSubject = (sub: string) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(sub)
        ? prev.subjects.filter(s => s !== sub)
        : [...prev.subjects, sub]
    }));
  };

  if (isMatching) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900">
        <div className="max-w-md w-full bg-white border border-slate-200 p-8 rounded-3xl shadow-xl text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto animate-bounce">
            <Sparkles size={28} />
          </div>
          <h2 className="text-xl font-black text-slate-950">Matching Your 1:5 Pod in Database...</h2>
          <p className="text-xs text-slate-500">
            Registered on live waitlist for {formData.grade} ({formData.board}). Allocating verified mentor and peers.
          </p>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="bg-indigo-600 h-2 rounded-full animate-pulse w-4/5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-black text-base text-slate-950">
            BlankLearn <span className="text-xs text-indigo-600 font-bold uppercase">Pod Onboarding</span>
          </Link>
          <span className="text-xs font-mono font-bold text-slate-400">Step {step} of 8</span>
        </div>
        <div className="max-w-2xl mx-auto mt-3 bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div className="bg-indigo-600 h-full rounded-full transition-all duration-300" style={{ width: `${(step / 8) * 100}%` }} />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-slate-950">Student's Full Name</h2>
              <input
                type="text"
                autoFocus
                required
                placeholder="e.g. Aarav Sharma"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-sm font-semibold p-3 rounded-xl border border-slate-200"
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-slate-950">Who is completing this setup?</h2>
              <div className="grid grid-cols-2 gap-3">
                {["Parent", "Student"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData({ ...formData, userType: t })}
                    className={`p-4 rounded-2xl border text-left font-bold text-sm ${formData.userType === t ? "bg-indigo-50 border-indigo-600 text-indigo-950" : "bg-slate-50 border-slate-200"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-slate-950">Select Class</h2>
              <div className="grid grid-cols-5 gap-1.5">
                {["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormData({ ...formData, grade: c })}
                    className={`py-3 text-xs font-bold rounded-xl border ${formData.grade === c ? "bg-indigo-600 border-indigo-600 text-white" : "bg-slate-50 border-slate-200"}`}
                  >
                    {c.replace("Class ", "Gr ")}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-slate-950">Select Board</h2>
              <div className="grid grid-cols-2 gap-3">
                {["CBSE", "ICSE"].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setFormData({ ...formData, board: b })}
                    className={`py-3 text-xs font-bold rounded-xl border ${formData.board === b ? "bg-indigo-600 border-indigo-600 text-white" : "bg-slate-50 border-slate-200"}`}
                  >
                    {b} Board
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-slate-950">Select Subjects Needed</h2>
              <div className="grid grid-cols-2 gap-2">
                {["Mathematics", "Science", "English", "Social Science"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSubject(s)}
                    className={`p-3 rounded-xl border text-xs font-bold text-left flex justify-between items-center ${formData.subjects.includes(s) ? "bg-indigo-50 border-indigo-600 text-indigo-950" : "bg-slate-50 border-slate-200"}`}
                  >
                    <span>{s}</span>
                    {formData.subjects.includes(s) && <Check size={14} className="text-indigo-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-slate-950">Primary Learning Goal</h2>
              <div className="space-y-2">
                {["Concept clarity (Fix fundamentals)", "Improve exam marks (Score 90%+)", "Homework help & doubts"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setFormData({ ...formData, goal: g })}
                    className={`w-full p-3 rounded-xl border text-xs font-bold text-left ${formData.goal === g ? "bg-indigo-50 border-indigo-600 text-indigo-950" : "bg-slate-50 border-slate-200"}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-slate-950">Preferred Evening Time Slot</h2>
              <div className="space-y-2">
                {["Early Evening (04:00 PM - 05:30 PM)", "Evening (05:30 PM - 07:00 PM)", "Night (07:00 PM - 08:30 PM)"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData({ ...formData, timeSlot: t })}
                    className={`w-full p-3 rounded-xl border text-xs font-bold text-left ${formData.timeSlot === t ? "bg-indigo-50 border-indigo-600 text-indigo-950" : "bg-slate-50 border-slate-200"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 8 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-slate-950">Confirm Micro-Batch Format</h2>
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-1">
                <span className="text-xs font-black text-indigo-900">Strict 1:5 Pod Enforced</span>
                <p className="text-xs text-slate-600">Max 5 students • Active camera & microphone • Daily wrap-up report</p>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                ← Back
              </button>
            ) : <div />}

            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm"
            >
              {step === 8 ? "Register on Live Waitlist →" : "Continue →"}
            </button>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        BlankLearn Real Firestore Student Registration
      </footer>
    </div>
  );
}