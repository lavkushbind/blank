"use client";

import React, { useState, use } from "react";
import { auth, db } from "@/lib/firebase/client";
import { doc, updateDoc, increment } from "firebase/firestore";
import Link from "next/link";
import { Award, ChevronRight, CheckCircle2 } from "lucide-react";
import { CoinShowerCelebration } from "@/components/student/CoinShowerCelebration";

const QUESTIONS = [
  { id: 1, text: "What is the solution of the linear equation: 3x - 5 = 16?", options: ["x = 5", "x = 7", "x = 6", "x = 9"], correct: 1 },
  { id: 2, text: "Which property allows us to write 2(x + 3) as 2x + 6?", options: ["Commutative", "Associative", "Distributive", "Closure"], correct: 2 },
  { id: 3, text: "If the perimeter of a square is 36 cm, what is its side length?", options: ["6 cm", "9 cm", "12 cm", "18 cm"], correct: 1 },
];

export default function StudentQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const user = auth.currentUser;

  const handleNext = async () => {
    let newScore = score;
    if (selectedOption === QUESTIONS[currentIdx].correct) {
      newScore += 50;
      setScore(newScore);
    }

    if (currentIdx + 1 < QUESTIONS.length) {
      setCurrentIdx(prev => prev + 1);
      setSelectedOption(null);
    } else {
      setIsFinished(true);

      // Real Firestore Coins Increment (+150 Coins & +1 Streak)
      if (user) {
        try {
          await updateDoc(doc(db, "students", user.uid), {
            coins: increment(newScore),
            streakDays: increment(1),
          });
        } catch (err) {
          console.error("Failed to update coins in Firestore:", err);
        }
      }
    }
  };

  const q = QUESTIONS[currentIdx];

  if (isFinished) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900">
        <CoinShowerCelebration trigger={true} />
        <div className="bg-white border border-slate-200 p-8 rounded-3xl max-w-md w-full text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
            <Award size={32} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-950">Daily Micro-Quiz Completed!</h2>
            <p className="text-xs text-slate-500">
              You scored <strong className="text-indigo-600 font-mono text-sm">+{score} Quiz Coins</strong>!
            </p>
          </div>
          <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-3 rounded-2xl font-bold">
            ✓ Coins saved directly to your real Firestore profile.
          </p>
          <Link
            href="/hub"
            className="block w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm"
          >
            Return to Student Hub →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex justify-between items-center text-xs font-bold">
          <span className="font-mono text-indigo-600 uppercase tracking-wider">Question {currentIdx + 1} of {QUESTIONS.length}</span>
          <span className="font-mono text-amber-600">🪙 +50 Coins / Correct</span>
        </div>

        <h3 className="text-base font-black text-slate-950 leading-snug">{q.text}</h3>

        <div className="space-y-2.5">
          {q.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedOption(idx)}
              className={`w-full text-left p-3.5 rounded-xl text-xs font-bold transition border ${
                selectedOption === idx
                  ? "bg-indigo-50 border-indigo-600 text-indigo-950 shadow-sm"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <button
          disabled={selectedOption === null}
          onClick={handleNext}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
        >
          {currentIdx + 1 === QUESTIONS.length ? "Finish Quiz & Earn Coins" : "Next Question"} <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}