"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ref, onValue, set } from "firebase/database";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { realtimeDb, db } from "@/lib/firebase/client";
import {
  Users,
  Star,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  QrCode,
  ShieldCheck,
  ArrowRight,
  Phone,
  Sparkles,
  Zap,
  BookOpen,
  Brain,
  MessageCircle,
  FileText,
  Loader2,
  Quote,
  X,
  PlayCircle
} from "lucide-react";

// =========================================================
// 1. MASTER DEMO BOOKING MODAL (Realtime DB + Pixel + Pass)
// =========================================================
function DemoBookingModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gradeNumber, setGradeNumber] = useState<number>(7);
  const [board, setBoard] = useState("CBSE");
  const [subject, setSubject] = useState("Mathematics");
  const [demoType, setDemoType] = useState<"GROUP" | "INDIVIDUAL">("GROUP");
  const [selectedSlot, setSelectedSlot] = useState("06:00 PM - 07:00 PM");

  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const PLAN_PRICE = "2499";

  // Meta Pixel: InitiateCheckout on Modal Open
  useEffect(() => {
    if (open) {
      if (typeof window !== "undefined") {
        import("react-facebook-pixel")
          .then((x) => x.default)
          .then((ReactPixel) => {
            try {
              ReactPixel.track("InitiateCheckout", {
                content_name: "Demo Modal Opened",
                value: 0,
                currency: "INR",
              });
            } catch (e) {
              console.warn("Pixel tracking error", e);
            }
          })
          .catch(() => {});
      }
    } else {
      setTimeout(() => {
        setIsSuccess(false);
        setErrorMsg("");
      }, 300);
    }
  }, [open]);

  const handleFreeBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Please enter the student's name.");
      return;
    }
    const sanitizedPhone = phone.replace(/\D/g, "");
    if (sanitizedPhone.length !== 10) {
      setErrorMsg("Please enter a valid 10-digit WhatsApp number.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const bookingPayload = {
        studentName: name.trim(),
        mobileNumber: sanitizedPhone,
        studentClass: `Class ${gradeNumber}`,
        board,
        subject,
        demoType: demoType === "GROUP" ? "Group of 5" : "1-on-1 Solo",
        interestedPlan: `Group of 5 (₹${PLAN_PRICE}/mo)`,
        demoTime: selectedSlot,
        status: "booked_free",
        bookingDate: new Date().toLocaleString(),
        isAppRegistered: false,
      };

      // 1. Write to Firebase Realtime Database
      const rtdbRef = ref(realtimeDb, `DemoBookings/${sanitizedPhone}`);
      await set(rtdbRef, bookingPayload);

      // 2. Also Write to Firestore for Web Portal Sync
      try {
        await addDoc(collection(db, "demo_bookings"), {
          ...bookingPayload,
          createdAt: serverTimestamp(),
        });
      } catch (fErr) {
        console.warn("Firestore sync warning", fErr);
      }

      // 3. Meta Pixel: Lead Event
      if (typeof window !== "undefined") {
        import("react-facebook-pixel")
          .then((x) => x.default)
          .then((ReactPixel) => {
            try {
              ReactPixel.track("Lead", {
                value: 0,
                currency: "INR",
                content_name: `${board} Class ${gradeNumber} ${subject} Lead`,
              });
            } catch (e) {
              console.warn("Pixel Lead error", e);
            }
          })
          .catch(() => {});
      }

      setLoading(false);
      setIsSuccess(true);
    } catch (error) {
      console.error("Booking submission error:", error);
      setLoading(false);
      setErrorMsg("Network error. Please try again.");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {!isSuccess ? (
          <>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 p-6 text-white text-center relative shrink-0">
              <button
                onClick={() => onOpenChange(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full"
              >
                <X size={18} />
              </button>
              <span className="bg-white/20 text-[10px] font-mono uppercase tracking-wider px-3 py-1 rounded-full font-bold">
                100% Free Trial • Zero Card Required
              </span>
              <h3 className="text-2xl font-black mt-2">Book Your 1:5 Trial Pod</h3>
              <p className="text-xs text-blue-100 mt-1">Live interactive class with certified mentor</p>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl font-bold flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Plan Display Card */}
              <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Interested Course</span>
                  <p className="font-black text-slate-900 text-base">Small Group Pod (Max 5)</p>
                  <p className="text-slate-500 text-[11px]">1 Hr Daily • Mon to Fri • Homework in Class</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-indigo-700 font-mono">₹{PLAN_PRICE}</span>
                  <span className="text-[10px] text-slate-400 block">/month</span>
                </div>
              </div>

              {/* 1. Class Selection (1 to 10) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Select Class (Grades 1 to 10)</label>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setGradeNumber(num)}
                      className={`py-2 text-xs font-black rounded-lg border transition ${
                        gradeNumber === num
                          ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Board & Subject Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Curriculum Board</label>
                  <select
                    value={board}
                    onChange={(e) => setBoard(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <option>CBSE</option>
                    <option>ICSE</option>
                    <option>UP Board</option>
                    <option>State Board</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Subject</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <option>Mathematics</option>
                    <option>Science</option>
                    <option>English</option>
                  </select>
                </div>
              </div>

              {/* 3. Demo Format */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Demo Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDemoType("GROUP")}
                    className={`p-2.5 rounded-xl border text-left font-bold transition ${
                      demoType === "GROUP"
                        ? "bg-blue-50 border-blue-600 text-blue-950"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Users size={13} className="text-blue-600" />
                      <span>Group of 5</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal block mt-0.5">₹0 Free Offer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDemoType("INDIVIDUAL")}
                    className={`p-2.5 rounded-xl border text-left font-bold transition ${
                      demoType === "INDIVIDUAL"
                        ? "bg-blue-50 border-blue-600 text-blue-950"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Solo 1-on-1</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal block mt-0.5">Dedicated Demo</span>
                  </button>
                </div>
              </div>

              {/* 4. Time Slots */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1">
                  <Clock size={13} className="text-blue-600" /> SELECT DEMO TIME (TOMORROW)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "04:00 PM - 05:00 PM",
                    "06:00 PM - 07:00 PM",
                    "07:00 PM - 08:00 PM",
                    "08:00 PM - 09:00 PM",
                  ].map((slot) => (
                    <div
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`cursor-pointer border rounded-xl p-2 text-center text-[11px] font-bold transition-all ${
                        selectedSlot === slot
                          ? "border-blue-600 bg-blue-50 text-blue-800"
                          : "border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50"
                      }`}
                    >
                      {slot}
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Inputs */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Student's Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Parent WhatsApp Number (10-Digit)</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 text-slate-600 text-xs font-bold">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      placeholder="98210 XXXXX"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs font-medium p-2.5 rounded-r-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Action */}
            <div className="p-4 bg-white border-t border-slate-100 shrink-0">
              <button
                onClick={handleFreeBooking}
                disabled={loading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin w-4 h-4" /> Reserving Seat...
                  </span>
                ) : (
                  "Confirm Free Demo Seat (₹0) →"
                )}
              </button>
            </div>
          </>
        ) : (
          /* ===================================================== */
          /* SUCCESS DIGITAL ADMIT PASS                             */
          /* ===================================================== */
          <div className="flex flex-col items-center justify-center text-center p-6 space-y-5 bg-slate-50 overflow-y-auto">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner mt-2">
              <CheckCircle2 size={32} />
            </div>

            <div>
              <h3 className="text-2xl font-black text-slate-900">Booking Confirmed!</h3>
              <p className="text-slate-500 text-xs mt-1">Your Demo Admit Pass is ready.</p>
            </div>

            {/* Digital Pass Ticket */}
            <div className="bg-white border border-slate-200 rounded-2xl w-full text-left relative overflow-hidden shadow-xl">
              <div className="bg-slate-900 text-white p-3 flex justify-between items-center">
                <span className="text-xs font-black tracking-wider font-mono">BLANKLEARN ADMIT PASS</span>
                <span className="bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                  TRIAL POD
                </span>
              </div>

              <div className="p-5 relative">
                <div className="absolute top-4 right-4 opacity-10">
                  <QrCode className="w-16 h-16" />
                </div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Student Name</p>
                <p className="font-black text-lg text-slate-900 mb-3">{name}</p>

                <div className="grid grid-cols-2 gap-2 border-t border-dashed border-slate-200 pt-3 text-xs">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Class & Board</p>
                    <p className="font-bold text-slate-800">{board} • Class {gradeNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Time Slot</p>
                    <p className="font-bold text-blue-600">{selectedSlot}</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-2.5 text-center border-t border-slate-100">
                <p className="text-xs text-blue-700 font-bold">Plan: Small Group (₹{PLAN_PRICE}/mo)</p>
              </div>
            </div>

            <div className="w-full space-y-2 pb-2">
              <button
                className="w-full h-12 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg"
                onClick={() => window.open("https://play.google.com/store/apps/details?id=com.blank_learn.dark", "_blank")}
              >
                <PlayCircle size={18} /> Download App to Join
              </button>

              <p className="text-[11px] text-slate-500 font-semibold bg-white px-3 py-1.5 rounded-full border border-slate-200 inline-block">
                🔔 Link active 10 mins before class time on WhatsApp & Web
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// =========================================================
// 2. MODERN NAVBAR
// =========================================================
const NavigationBar = ({ onBookDemoClick }: { onBookDemoClick: () => void }) => (
  <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-base shadow-sm">
          BL
        </div>
        <div>
          <span className="text-xl font-black text-slate-900 tracking-tight">Blanklearn</span>
          <span className="block text-[9px] font-bold text-blue-600 uppercase tracking-wider -mt-1">
            Small Group (1:5)
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="text-xs font-bold text-slate-700 hover:text-slate-950 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition"
        >
          Portal Login
        </Link>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition"
          onClick={onBookDemoClick}
        >
          Book Free Demo
        </button>
      </div>
    </div>
  </header>
);

// =========================================================
// 3. HERO SECTION
// =========================================================
const HeroHeader = ({ onBookDemoClick }: { onBookDemoClick: () => void }) => (
  <section className="py-16 md:py-24 bg-gradient-to-b from-blue-50/70 via-white to-white relative overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        
        <div className="text-center lg:text-left z-10 space-y-6">
          <div className="inline-flex items-center gap-1.5 bg-yellow-50 text-yellow-800 px-3.5 py-1.5 rounded-full text-xs font-black border border-yellow-200 shadow-sm">
            <Star className="w-3.5 h-3.5 fill-current text-yellow-500" /> 4.9/5 Rated by 500+ Parents
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-950 leading-[1.15] tracking-tight">
            Stop the Homework <span className="text-blue-600">Struggle.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Live interactive classes kids actually love. Personal attention, daily homework support, and concept clarity—at just <span className="font-bold text-slate-900">₹2499/month</span>.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <button
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white h-14 px-8 text-base font-black rounded-2xl shadow-xl shadow-blue-500/25 transition flex items-center justify-center gap-2"
              onClick={onBookDemoClick}
            >
              Book Free Live Demo <ArrowRight size={16} />
            </button>
            <p className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> No credit card needed
            </p>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full blur-3xl opacity-60 -z-10" />
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-black text-slate-900">Live 1:5 Interactive Pod</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded font-mono">
                MAX 5 STUDENTS
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span><strong>1 Hour Daily Live Class:</strong> Monday to Friday</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span><strong>Homework Done in Class:</strong> Evenings are 100% peaceful</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span><strong>Camera ON Always:</strong> Teacher calls your child by name</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span><strong>Full Recording Access:</strong> Watch anytime on Web or App</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={onBookDemoClick}
                className="w-full py-3 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Claim Free Demo Seat Today →
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </section>
);

// =========================================================
// 4. REALTIME STUDENT HIGHLIGHTS (Realtime DB: VideoUploads)
// =========================================================
const StudentHighlights = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  useEffect(() => {
    try {
      const videosRef = ref(realtimeDb, "VideoUploads");
      onValue(videosRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setVideos(
            Object.entries(data).map(([key, value]: [string, any]) => ({
              id: key,
              url: value.videoUrl || value.postUrl || value.url,
              thumbnail: value.thumbnail || value.image || "",
            }))
          );
        }
        setLoading(false);
      });
    } catch (e) {
      setLoading(false);
    }
  }, []);

  const handlePlay = (id: string) => {
    Object.keys(videoRefs.current).forEach((key) => {
      if (key !== id && videoRefs.current[key]) videoRefs.current[key]?.pause();
    });
    if (videoRefs.current[id]) videoRefs.current[id]?.play();
    setPlayingId(id);
  };

  return (
    <section className="py-20 bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14 space-y-2">
          <span className="inline-block py-1 px-3 rounded-full bg-blue-900/50 border border-blue-700 text-blue-300 text-xs font-bold tracking-wider uppercase">
            Live Classroom Footage 🎥
          </span>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">
            See the Magic <span className="text-blue-400">Live.</span>
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Watch how our mentors make tough concepts easy in real-time.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center h-32 items-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : videos.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div
                key={video.id}
                className={`relative group rounded-3xl overflow-hidden bg-black border border-slate-800 transition-all duration-300 ${
                  playingId === video.id ? "ring-2 ring-blue-500 shadow-2xl scale-105 z-10" : "hover:scale-[1.02]"
                }`}
                style={{ aspectRatio: "16/9" }}
              >
                <video
                  ref={(el) => { videoRefs.current[video.id] = el; }}
                  className="w-full h-full object-cover"
                  src={video.url}
                  controls={playingId === video.id}
                  playsInline
                  poster={video.thumbnail}
                  onPlay={() => setPlayingId(video.id)}
                  onEnded={() => setPlayingId(null)}
                />
                {playingId !== video.id && (
                  <div
                    className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center cursor-pointer"
                    onClick={() => handlePlay(video.id)}
                  >
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 shadow-xl group-hover:scale-110 transition-transform">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-inner">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center text-slate-400 text-xs max-w-md mx-auto">
            Classroom clips are updating. Check back shortly.
          </div>
        )}
      </div>
    </section>
  );
};

// =========================================================
// 5. PAIN & SOLUTION SECTION
// =========================================================
const PainAndSolution = ({ onBookDemoClick }: { onBookDemoClick: () => void }) => (
  <section className="py-20 bg-slate-50 relative overflow-hidden">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 space-y-12">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 px-3.5 py-1 rounded-full text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" /> Trusted by 500+ Working Parents
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-slate-950">
          Why Parents Choose Us? 💝
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">Real problems. Real solutions. Real peace of mind.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Pain 1 */}
        <div className="bg-white rounded-3xl border border-red-100 p-6 shadow-sm space-y-3">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 font-bold">
            <Clock size={24} />
          </div>
          <h3 className="text-lg font-black text-slate-900">The Homework Battle 😫</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Coming home exhausted to pending homework fights. No energy left for quality family time.
          </p>
          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded inline-block">
            ⚠️ 78% parents feel this daily
          </span>
        </div>

        {/* Pain 2 */}
        <div className="bg-white rounded-3xl border border-amber-100 p-6 shadow-sm space-y-3">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 font-bold">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-lg font-black text-slate-900">The 50-Kid Crowd 😰</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Local coaching packs 50+ kids. Your child stays on mute with zero personal attention.
          </p>
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-block">
            ⚠️ 1 Teacher : 50+ Kids
          </span>
        </div>

        {/* The Solution */}
        <div
          onClick={onBookDemoClick}
          className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl p-6 shadow-xl space-y-3 cursor-pointer hover:scale-[1.02] transition"
        >
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center font-bold">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-lg font-black">The Solution: 1:5 Pods ✨</h3>
          <p className="text-xs text-blue-100 leading-relaxed">
            Small Batches (Max 5). Homework finished in class. Child excels, parents relax.
          </p>
          <div className="pt-2 flex items-center justify-between font-bold text-xs">
            <span>100% Personal Care</span>
            <span className="flex items-center gap-1">Try Demo <ArrowRight size={13} /></span>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// =========================================================
// 6. DYNAMIC REVIEWS (Realtime DB: reviews)
// =========================================================
const SocialProof = () => {
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    try {
      const revRef = ref(realtimeDb, "reviews");
      onValue(revRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setReviews(
            Object.entries(data).map(([key, value]: [string, any]) => ({
              id: key,
              name: value.name || "Parent",
              rating: value.rating || 5,
              reviewText: value.reviewText || value.text || "",
            }))
          );
        }
      });
    } catch (e) {}
  }, []);

  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 space-y-2">
          <h2 className="text-3xl font-black text-slate-950">What Parents Are Saying</h2>
          <p className="text-xs text-slate-500">Real verified feedback from working parents</p>
        </div>

        {reviews.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((r) => (
              <div key={r.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-900 text-xs">{r.name}</h4>
                  <div className="flex text-yellow-400 text-xs">{"★".repeat(r.rating || 5)}</div>
                </div>
                <p className="text-xs text-slate-600 italic leading-relaxed">"{r.reviewText}"</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-xs text-slate-400">Loading parent feedback...</div>
        )}
      </div>
    </section>
  );
};

// =========================================================
// 7. PRICING SECTION (₹2,499/mo)
// =========================================================
const PricingPlan = ({ onBookDemoClick }: { onBookDemoClick: () => void }) => (
  <section className="py-20 bg-slate-50 border-t border-slate-200">
    <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-950">Simple, Affordable Pricing</h2>
        <p className="text-xs text-slate-500">Quality education with strictly 5 students per batch.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Monthly Plan */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              Monthly Batch
            </span>
            <h3 className="text-2xl font-black text-slate-950">₹2,499 <span className="text-xs text-slate-400 font-normal">/mo</span></h3>
            <ul className="space-y-2 text-xs text-slate-600 font-medium">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Live Classes (Mon-Fri)</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> 1 Hour Daily Sessions</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Max 5 Students Batch</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Homework Done in Class</li>
            </ul>
          </div>
          <button
            onClick={onBookDemoClick}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md"
          >
            Book Free Demo
          </button>
        </div>

        {/* Quarterly Saver */}
        <div className="bg-white rounded-3xl p-6 border-2 border-blue-600 shadow-xl relative space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-white bg-blue-600 px-2.5 py-0.5 rounded-full uppercase">
                Best Value
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Save ₹800
              </span>
            </div>
            <h3 className="text-2xl font-black text-slate-950">₹5,500 <span className="text-xs text-slate-400 font-normal">/ 3 mo</span></h3>
            <ul className="space-y-2 text-xs text-slate-600 font-medium">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-blue-600" /> Everything in Monthly</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-blue-600" /> Syllabus Completion Guarantee</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-blue-600" /> Monthly Progress Report</li>
            </ul>
          </div>
          <button
            onClick={onBookDemoClick}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg"
          >
            Book Free Demo
          </button>
        </div>

        {/* Annual Plan */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
              Annual Plan
            </span>
            <h3 className="text-2xl font-black text-slate-950">₹15,000 <span className="text-xs text-slate-400 font-normal">/ 10 mo</span></h3>
            <ul className="space-y-2 text-xs text-slate-600 font-medium">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-600" /> Full Year Coverage</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-600" /> Save ₹3,000 Flat</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-600" /> Free E-Books & Materials</li>
            </ul>
          </div>
          <button
            onClick={onBookDemoClick}
            className="w-full py-3 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-md"
          >
            Book Free Demo
          </button>
        </div>
      </div>
    </div>
  </section>
);

// =========================================================
// 8. FAQ ACCORDION
// =========================================================
const FinalFAQ = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const faqs = [
    { q: "Is it a Live or Recorded Class?", a: "100% LIVE & Interactive classes. Students speak face-to-face with the teacher. No boring pre-recorded videos." },
    { q: "How many students are in one batch?", a: "Strictly maximum 5 students per batch. This ensures every child gets individual attention." },
    { q: "What is the daily schedule?", a: "Monday to Friday, 1 hour daily. Evening slots available so it never clashes with school." },
    { q: "What if my child misses a class?", a: "Full class recording is automatically saved in your child's portal." },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-slate-950">Frequently Asked Questions</h2>
          <p className="text-xs text-slate-500">Everything you need to know about our program</p>
        </div>

        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full text-left p-4 font-bold text-xs sm:text-sm text-slate-900 flex justify-between items-center hover:bg-slate-50"
              >
                <span>{f.q}</span>
                <span className="text-blue-600 font-mono text-base">{openIdx === i ? "−" : "+"}</span>
              </button>
              {openIdx === i && (
                <div className="p-4 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100 mt-2">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// =========================================================
// 9. FOOTER & STICKY MOBILE BAR
// =========================================================
const Footer = ({ onBookDemoClick }: { onBookDemoClick: () => void }) => (
  <footer className="bg-slate-950 text-slate-400 py-12 px-4 sm:px-6 text-xs">
    <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6 border-b border-slate-800 pb-8">
      <div>
        <span className="font-black text-white text-base">Blanklearn Education</span>
        <p className="text-[11px] text-slate-500 mt-0.5">Empowering young minds with 1:5 live learning.</p>
      </div>
      <div className="flex gap-4">
        <button onClick={onBookDemoClick} className="text-white font-bold hover:underline">
          Book Free Demo
        </button>
        <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
        <Link href="/terms" className="hover:text-white">Terms of Service</Link>
      </div>
    </div>
    <div className="max-w-7xl mx-auto pt-6 text-center text-[11px] text-slate-500">
      © 2026 Blanklearn Education. All rights reserved. • Helpline: +91 9235044520
    </div>
  </footer>
);

const StickyBookingBar = ({ onBookDemoClick }: { onBookDemoClick: () => void }) => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const toggle = () => setIsVisible(window.scrollY > 300);
    window.addEventListener("scroll", toggle);
    return () => window.removeEventListener("scroll", toggle);
  }, []);

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 z-40 md:hidden transition-transform ${isVisible ? "translate-y-0" : "translate-y-full"}`}>
      <div className="flex justify-between items-center">
        <div>
          <p className="font-black text-slate-900 text-xs">🔥 ₹2499/mo Plan</p>
          <p className="text-[10px] text-emerald-600 font-bold">100% Free Trial Pod</p>
        </div>
        <button
          onClick={onBookDemoClick}
          className="bg-blue-600 text-white font-black text-xs px-4 py-2 rounded-xl shadow-md"
        >
          Book Demo Now
        </button>
      </div>
    </div>
  );
};

export default function HomePage() {
  const [isDemoModalOpen, setDemoModalOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 selection:bg-blue-100">
      <Suspense fallback={null}>
        <DemoBookingModal open={isDemoModalOpen} onOpenChange={setDemoModalOpen} />
      </Suspense>
      <NavigationBar onBookDemoClick={() => setDemoModalOpen(true)} />
      <main>
        <HeroHeader onBookDemoClick={() => setDemoModalOpen(true)} />
        <StudentHighlights />
        <PainAndSolution onBookDemoClick={() => setDemoModalOpen(true)} />
        <SocialProof />
        <PricingPlan onBookDemoClick={() => setDemoModalOpen(true)} />
        <FinalFAQ />
      </main>
      <Footer onBookDemoClick={() => setDemoModalOpen(true)} />
      <StickyBookingBar onBookDemoClick={() => setDemoModalOpen(true)} />
    </div>
  );
}