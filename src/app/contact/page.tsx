"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PhoneCall, Mail, MapPin, CheckCircle2 } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-black text-base text-slate-950">
            BL BlankLearn Support
          </Link>
          <Link href="/" className="text-xs font-bold text-slate-600 hover:text-slate-900">
            Home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-slate-950">Parent & Teacher Support Desk</h1>
          <p className="text-xs text-slate-500">We respond to all queries within 15 minutes during 9 AM - 9 PM.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-5 space-y-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400">WhatsApp & Phone Helpline</span>
              <p className="text-base font-black text-slate-950">+91 98210-BLANK</p>
              <p className="text-[11px] text-slate-500">Daily 09:00 AM - 09:00 PM IST</p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400">Official Email</span>
              <p className="text-sm font-black text-indigo-600">support@blanklearn.com</p>
              <p className="text-[11px] text-slate-500">For billing and teacher verification queries</p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400">Headquarters</span>
              <p className="text-xs font-bold text-slate-800">BlankLearn Technologies Pvt Ltd</p>
              <p className="text-[11px] text-slate-500">Sector 62, Noida, Delhi-NCR, India</p>
            </div>
          </div>

          <div className="md:col-span-7 bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-sm space-y-4">
            {!submitted ? (
              <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-3.5">
                <h3 className="text-base font-black text-slate-950">Send an Instant Message</h3>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Mobile Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="98210 XXXXX"
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">How can we help you?</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. I want to know about Class 8 ICSE Maths timing slots..."
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                >
                  Send Message →
                </button>
              </form>
            ) : (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <h4 className="text-base font-black text-slate-950">Query Received!</h4>
                <p className="text-xs text-slate-500">Our academic counselor will WhatsApp/call you in 15 minutes.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        BlankLearn Help Desk • 100% Human Support
      </footer>
    </div>
  );
}