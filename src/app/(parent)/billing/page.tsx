"use client";

import React, { useState } from "react";
import { Sparkles, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";

export default function ParentBillingPage() {
  const [selectedPlan, setSelectedPlan] = useState<"MONTHLY" | "QUARTERLY">("MONTHLY");
  const [applyCoins, setApplyCoins] = useState(true);

  const coinBalance = 450; // Aarav earned 450 coins
  const basePrice = selectedPlan === "MONTHLY" ? 3499 : 8999;
  const discount = applyCoins ? coinBalance : 0;
  const finalPrice = basePrice - discount;

  const handlePayment = async () => {
    try {
      const res = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseAmount: basePrice,
          coinDiscount: discount,
          planType: selectedPlan,
          childId: "child_aarav_01",
        }),
      });
      const data = await res.json();
      alert(`Razorpay Checkout Triggered!\nOrder ID: ${data.order.id}\nDiscount Applied: ₹${discount}\nFinal Payable: ₹${data.finalPayable}`);
    } catch (err) {
      console.error("Order initiation error", err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      
      {/* Scarcity Pod-Lock Warning */}
      <div className="bg-amber-50 border border-amber-200 p-4 sm:p-5 rounded-3xl flex items-start gap-3 text-amber-900">
        <span className="text-xl">⚠️</span>
        <div className="space-y-0.5">
          <h4 className="text-xs font-black">Seat Reservation Alert</h4>
          <p className="text-xs text-amber-800 leading-relaxed">
            Rahul Sir's Class 7 Evening 1:5 Pod has only 1 open seat for Aarav next month. Renew before Sunday to ensure the seat is not offered to waitlisted students.
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-black text-slate-950">Renew 1:5 Pod Subscription</h1>
        <p className="text-xs text-slate-500">Student: Aarav Sharma • CBSE Class 7 Mathematics & Science</p>
      </div>

      {/* Plan Tiers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Monthly */}
        <div
          onClick={() => setSelectedPlan("MONTHLY")}
          className={`p-6 rounded-3xl border-2 cursor-pointer transition ${
            selectedPlan === "MONTHLY"
              ? "border-indigo-600 bg-white shadow-md shadow-indigo-100"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded">
            1 Month Pod
          </span>
          <h3 className="text-2xl font-black text-slate-950 mt-3">₹3,499</h3>
          <p className="text-xs text-slate-500 mt-1">12 Live Sessions • 3 classes / week</p>
        </div>

        {/* Quarterly */}
        <div
          onClick={() => setSelectedPlan("QUARTERLY")}
          className={`p-6 rounded-3xl border-2 cursor-pointer transition relative ${
            selectedPlan === "QUARTERLY"
              ? "border-indigo-600 bg-white shadow-md shadow-indigo-100"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <div className="absolute -top-2.5 right-6 bg-emerald-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
            Save 15%
          </div>
          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded">
            3 Months (Quarterly)
          </span>
          <h3 className="text-2xl font-black text-slate-950 mt-3">₹8,999</h3>
          <p className="text-xs text-slate-500 mt-1">36 Live Sessions • Full Syllabus Guarantee</p>
        </div>
      </div>

      {/* Quiz Coins Flat Discount Toggle */}
      <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <Sparkles size={20} />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900">Redeem Aarav's Quiz Coins</h4>
            <p className="text-[11px] text-slate-500">450 coins earned from daily micro-quizzes = Flat ₹450 Off</p>
          </div>
        </div>

        <input
          type="checkbox"
          checked={applyCoins}
          onChange={(e) => setApplyCoins(e.target.checked)}
          className="w-5 h-5 rounded cursor-pointer accent-indigo-600"
        />
      </div>

      {/* Price Breakdown */}
      <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-2.5 text-xs">
        <div className="flex justify-between text-slate-500 font-medium">
          <span>Base 1:5 Pod Subscription</span>
          <span>₹{basePrice}</span>
        </div>
        {applyCoins && (
          <div className="flex justify-between text-amber-700 font-mono font-bold">
            <span>Student Quiz Coins Discount</span>
            <span>-₹{coinBalance}</span>
          </div>
        )}
        <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-sm font-black text-slate-950">
          <span>Total Payable</span>
          <span className="text-2xl text-emerald-700 font-mono">₹{finalPrice}</span>
        </div>
      </div>

      {/* Checkout Button */}
      <button
        onClick={handlePayment}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md shadow-indigo-600/25 transition flex items-center justify-center gap-2"
      >
        Pay ₹{finalPrice} via Razorpay (UPI, GPay, Cards, NetBanking) <ArrowRight size={16} />
      </button>

      <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
        <ShieldCheck size={14} /> 100% Encrypted & Secure Razorpay Payment Gateway
      </div>

    </div>
  );
}