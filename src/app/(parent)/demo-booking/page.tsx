"use client";

import React, { useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { 
  CheckCircle2, 
  Users, 
  User, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle
} from "lucide-react";

export default function MasterDemoBookingPage() {
  const [gradeNumber, setGradeNumber] = useState<number>(8);
  const [board, setBoard] = useState<"CBSE" | "ICSE" | "UP Board" | "State Board">("CBSE");
  const [subject, setSubject] = useState<"Mathematics" | "Science" | "English">("Mathematics");
  const [demoType, setDemoType] = useState<"GROUP" | "INDIVIDUAL">("GROUP");
  const [slotTime, setSlotTime] = useState("06:00 PM");
  const [bookingDate, setBookingDate] = useState("2026-09-25");
  const [studentName, setStudentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmedData, setConfirmedData] = useState<any>(null);

  const isOfferActive = process.env.NEXT_PUBLIC_DEMO_OFFER_ACTIVE === "true";
  const regularPrice = 99;
  const finalPrice = isOfferActive ? 0 : regularPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/demo/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName,
          parentPhone,
          gradeNumber,
          board,
          subject,
          demoType,
          bookingDate,
          slotTime,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Booking allocation failed");
      }

      if (data.isFree) {
        setConfirmedData(data.allocation);
      } else {
        if (!(window as any).Razorpay) {
          throw new Error("Razorpay SDK not loaded.");
        }

        const options = {
          key: data.keyId,
          amount: data.payableAmount * 100,
          currency: "INR",
          name: "BlankLearn India",
          description: `${board} Class ${gradeNumber} ${subject} 1:5 Demo`,
          order_id: data.orderId,
          handler: function (response: any) {
            setConfirmedData({
              bookingId: response.razorpay_payment_id,
              teacherName: "Assigned Mentor",
              slotTime,
              date: bookingDate,
            });
          },
          prefill: {
            name: studentName,
            contact: parentPhone,
          },
          theme: {
            color: "#4f46e5",
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-10 px-4 sm:px-6 flex flex-col justify-between">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="max-w-3xl mx-auto w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold font-mono">
            <ShieldCheck size={14} /> Official 1:5 Micro-Batch Pod
          </div>
          <h1 className="text-3xl font-black text-slate-950">Book a Free 1:5 Diagnostic Demo</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Strict 1:5 Invariant. Exactly matched by Class, Board, Subject, and Slot.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!confirmedData ? (
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            
            {/* 1. SELECT CLASS (1 to 10 ONLY) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">1. Select Class (Grades 1 to 10)</label>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setGradeNumber(num)}
                    className={`py-2.5 text-xs font-black rounded-xl border transition ${
                      gradeNumber === num ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. SELECT BOARD */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">2. Curriculum Board</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["CBSE", "ICSE", "UP Board", "State Board"] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBoard(b)}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      board === b ? "bg-indigo-50 border-indigo-600 text-indigo-950 font-black shadow-sm" : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. SELECT SUBJECT */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">3. Subject (Maths / Science / English)</label>
              <div className="grid grid-cols-3 gap-2">
                {(["Mathematics", "Science", "English"] as const).map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSubject(sub)}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      subject === sub ? "bg-indigo-50 border-indigo-600 text-indigo-950 font-black shadow-sm" : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. CHOOSE DEMO TYPE (STRICT MAX 5 STUDENTS) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">4. Demo Format</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setDemoType("GROUP")}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    demoType === "GROUP" ? "border-indigo-600 bg-indigo-50/70 shadow-sm" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Users size={15} className="text-indigo-600" /> 1:5 Group Pod (Max 5)
                    </span>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      Standard
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Matched with up to 4 peers of same class & syllabus (Strict 1:5 Pod).</p>
                </div>

                <div
                  onClick={() => setDemoType("INDIVIDUAL")}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    demoType === "INDIVIDUAL" ? "border-indigo-600 bg-indigo-50/70 shadow-sm" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <User size={15} className="text-indigo-600" /> Individual Demo
                    </span>
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                      1-on-1 Solo
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Dedicated solo mentor session. Never mixed with groups.</p>
                </div>
              </div>
            </div>

            {/* 5. SELECT DATE & SLOT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Time Slot</label>
                <select
                  value={slotTime}
                  onChange={(e) => setSlotTime(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                >
                  <option value="05:00 PM">05:00 PM - 06:00 PM</option>
                  <option value="06:00 PM">06:00 PM - 07:00 PM</option>
                  <option value="07:00 PM">07:00 PM - 08:00 PM</option>
                  <option value="08:00 PM">08:00 PM - 09:00 PM</option>
                </select>
              </div>
            </div>

            {/* 6. CONTACT DETAILS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student's Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Sharma"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Parent WhatsApp Number</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-slate-600 text-xs font-bold">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="98210 XXXXX"
                    pattern="[0-9]{10}"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 rounded-r-xl border border-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* PRICING */}
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Demo Fee</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-2xl font-black text-emerald-700 font-mono">₹{finalPrice}</span>
                  {isOfferActive && (
                    <span className="text-xs text-slate-400 line-through">₹{regularPrice}</span>
                  )}
                  {isOfferActive && (
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      100% OFF APPLIED
                    </span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 shrink-0"
              >
                {loading ? "Allocating 1:5 Pod..." : (
                  finalPrice === 0 ? "Confirm Free Demo (₹0) →" : `Pay ₹${finalPrice} & Book Demo →`
                )}
              </button>
            </div>

          </form>
        ) : (
          <div className="bg-white border border-slate-200 p-8 sm:p-12 rounded-3xl shadow-xl text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={32} />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-950">1:5 Demo Successfully Confirmed!</h2>
              <p className="text-xs text-slate-500 font-mono">Booking ID: #{confirmedData.bookingId?.slice(-8)}</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl text-xs text-left space-y-2 max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-slate-500">Student:</span>
                <strong className="text-slate-900">{studentName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Class & Board:</span>
                <strong className="text-indigo-600">{board} Class {gradeNumber} {subject} (Max 5 Pod)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Mentor:</span>
                <strong className="text-slate-900">{confirmedData.teacherName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Scheduled Time:</span>
                <strong className="text-emerald-700">{confirmedData.date} at {confirmedData.slotTime}</strong>
              </div>
            </div>

            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Classroom link sent to <strong>+91 {parentPhone}</strong> on WhatsApp.
            </p>

            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-sm"
            >
              Access Student Portal →
            </Link>
          </div>
        )}
      </div>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        BlankLearn Official 1:5 Demo Engine • Live Razorpay rzp_live_6vd9RApruseTAi
      </footer>
    </div>
  );
}