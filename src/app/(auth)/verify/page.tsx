"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ArrowRight, ArrowLeft, RotateCcw } from "lucide-react";

export default function OTPVerificationPage() {
  const router = useRouter();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(59);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    // Auto-advance to next box
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const pin = digits.join("");
    if (pin.length === 6) {
      document.cookie = `__session=mock_session_${Date.now()}; path=/; max-age=86400`;
      router.push("/hub");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex justify-between items-center max-w-4xl mx-auto w-full">
        <Link href="/" className="font-black text-base text-slate-950">
          BlankLearn
        </Link>
        <Link href="/login" className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Login
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 space-y-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
            <ShieldCheck size={28} />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-950">Verify Your Number</h1>
            <p className="text-xs text-slate-500">
              We have dispatched a 6-digit authentication code to your registered WhatsApp / Mobile.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-6">
            {/* 6-Box PIN Inputs */}
            <div className="flex justify-center gap-2 sm:gap-2.5">
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="w-11 h-13 sm:w-12 sm:h-14 text-center text-lg font-black rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600 bg-slate-50/50 shadow-sm"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={digits.some((d) => !d)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              Verify & Launch My Pod <ArrowRight size={14} />
            </button>
          </form>

          {/* Resend Timer */}
          <div className="text-xs text-slate-500">
            {timer > 0 ? (
              <span>Resend OTP in <strong className="font-mono text-slate-900">{timer}s</strong></span>
            ) : (
              <button
                onClick={() => setTimer(59)}
                className="text-indigo-600 font-bold hover:underline inline-flex items-center gap-1"
              >
                <RotateCcw size={12} /> Resend OTP Now
              </button>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        BlankLearn Secure Authentication Gateway
      </footer>
    </div>
  );
}