"use client";

import { readApiResponse } from "@/lib/api-response";

import { trackConversion } from "@/lib/marketing/conversions";

import { demoPrice } from "@/lib/platform/demo-price";

import { toPaise } from "@/lib/payments/money";



import { usePlatformSettings } from "@/lib/platform/client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";

import Script from "next/script";

import {

  ArrowRight,

  CalendarDays,

  Check,

  CheckCircle2,

  ChevronLeft,

  ChevronRight,

  Clock3,

  GraduationCap,

  LockKeyhole,

  Mail,

  MessageCircle,

  RefreshCw,

  ShieldCheck,

  Sparkles,

  UserRound,

  Users,

  X,

} from "lucide-react";

import {

  createUserWithEmailAndPassword,

  GoogleAuthProvider,

  onAuthStateChanged,

  sendEmailVerification,

  signInWithEmailAndPassword,

  signInWithPopup,

  updateProfile,

  type User,

} from "firebase/auth";

import { auth, db } from "@/lib/firebase/client";

import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";



/* -------------------------------------------------------------------------- */

/* CONFIG                                                                      */

/* -------------------------------------------------------------------------- */



type BoardId = "CBSE" | "ICSE" | "STATE" | "OTHER";

type ProgramId = "MATH_ONLY" | "ENGLISH_ONLY" | "ALL_SUBJECTS";

type DemoType = "GROUP" | "INDIVIDUAL";

type SlotId = "15_16" | "16_17" | "17_18" | "18_19" | "19_20" | "20_21";

type AuthMode = "GOOGLE" | "EMAIL";



type Suggestion = {

  date: string;

  slotId: SlotId;

  startTime: string;

  endTime: string;

  label: string;

  availableTeachers: number;

  hasExistingBatch: boolean;
  batches?: { id: string; teacherName: string; enrolledCount: number; capacity: number }[];

};



type BookingResponse = {
  pendingAllocation?: boolean;

  success: boolean;

  code?: string;

  message?: string;

  errors?: string[];

  booking?: {

    id: string;

    batchId: string;

    teacherId: string;

    classNumber: number;

    board: string;

    programId: string;

    subjects: string[];

    demoType: DemoType;

    date: string;

    sessionDates?: string[];

    slotId: string;

    startTime: string;

    endTime: string;

    status: string;

    paymentStatus: string;

  };

  pricing?: {

    currency: string;

    originalPrice: number;

    discount: number;

    finalPrice: number;

    paymentRequired: boolean;

  };

  teacher?: { id: string; name: string | null };

  batch?: {

    id: string;

    enrolledCount: number;

    capacity: number;

    createdNewBatch: boolean;

  };

};



type RazorpayOrderResponse = {

  success: boolean;

  orderId?: string;

  keyId?: string;

  amount?: number;

  currency?: string;

  message?: string;

};



type Confirmation = {

  bookingId: string;

  batchId: string;

  teacherName: string;

  teacherId: string;

  date: string;

  sessionDates: string[];

  startTime: string;

  endTime: string;

  finalPrice: number;

  enrolledCount: number;

  capacity: number;

};



type RazorpayPaymentResponse = {

  razorpay_payment_id: string;

  razorpay_order_id: string;

  razorpay_signature: string;

};



declare global {

  interface Window {

    Razorpay: new (options: any) => { open: () => void };

  }

}



const BOARDS: Array<{ id: BoardId; name: string; description: string }> = [

  { id: "CBSE", name: "CBSE", description: "Central curriculum" },

  { id: "ICSE", name: "ICSE", description: "CISCE curriculum" },

  { id: "STATE", name: "State Board", description: "State curriculum" },

  { id: "OTHER", name: "Other", description: "Recognised board" },

];



const PROGRAMS: Array<{

  id: ProgramId;

  title: string;

  description: string;

  subjects: string[];

}> = [

  {

    id: "MATH_ONLY",

    title: "Only Math",

    description: "A focused Mathematics diagnostic session.",

    subjects: ["Math"],

  },

  {

    id: "ENGLISH_ONLY",

    title: "Only English",

    description: "A focused English diagnostic session.",

    subjects: ["English"],

  },

  {

    id: "ALL_SUBJECTS",

    title: "Math + Science + English",

    description: "Experience the complete BlankLearn approach.",

    subjects: ["Math", "Science", "English"],

  },

];



const SLOTS: Array<{ id: SlotId; label: string; startTime: string; endTime: string }> = [

  { id: "15_16", label: "3:00 PM – 4:00 PM", startTime: "15:00", endTime: "16:00" },

  { id: "16_17", label: "4:00 PM – 5:00 PM", startTime: "16:00", endTime: "17:00" },

  { id: "17_18", label: "5:00 PM – 6:00 PM", startTime: "17:00", endTime: "18:00" },

  { id: "18_19", label: "6:00 PM – 7:00 PM", startTime: "18:00", endTime: "19:00" },

  { id: "19_20", label: "7:00 PM – 8:00 PM", startTime: "19:00", endTime: "20:00" },

  { id: "20_21", label: "8:00 PM – 9:00 PM", startTime: "20:00", endTime: "21:00" },

];









/* -------------------------------------------------------------------------- */

/* HELPERS                                                                    */

/* -------------------------------------------------------------------------- */



function localDate(offset = 0) {

  const d = new Date();

  d.setDate(d.getDate() + offset);

  const y = d.getFullYear();

  const m = String(d.getMonth() + 1).padStart(2, "0");

  const day = String(d.getDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;

}



function formatDate(value: string) {

  if (!value) return "";

  const d = new Date(`${value}T00:00:00`);

  return d.toLocaleDateString("en-IN", {

    weekday: "short",

    day: "numeric",

    month: "short",

    year: "numeric",

  });

}



function formatPrice(amount: number) {

  return new Intl.NumberFormat("en-IN", {

    style: "currency",

    currency: "INR",

    maximumFractionDigits: 0,

  }).format(amount);

}



function getProgram(id: ProgramId) {

  return PROGRAMS.find((x) => x.id === id) ?? PROGRAMS[0];

}



function getSlot(id: SlotId) {

  return SLOTS.find((x) => x.id === id) ?? SLOTS[3];

}



function classLabel(n: number) {

  return `Class ${n}`;

}



/* -------------------------------------------------------------------------- */

/* SMALL UI                                                                   */

/* -------------------------------------------------------------------------- */



function GoogleIcon() {

  return (

    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">

      <path fill="#4285F4" d="M21.35 12.27c0-.71-.06-1.39-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.22Z" />

      <path fill="#34A853" d="M12 21.76c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.75 9.75 0 0 0 12 21.76Z" />

      <path fill="#FBBC05" d="M6.54 13.84A5.86 5.86 0 0 1 6.24 12c0-.64.11-1.26.3-1.84V7.63H3.3A9.77 9.77 0 0 0 2.24 12c0 1.58.38 3.08 1.06 4.37l3.24-2.53Z" />

      <path fill="#EA4335" d="M12 6.13c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.83 3.2 14.63 2.24 12 2.24a9.75 9.75 0 0 0-8.7 5.39l3.24 2.53C7.31 7.85 9.46 6.13 12 6.13Z" />

    </svg>

  );

}



function StepPill({ number, active }: { number: string; active: boolean }) {

  return (

    <div className={`flex h-8 w-8 items-center justify-center rounded-xl text-[9px] font-black transition-all duration-300 ${active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-slate-100 text-slate-400"}`}>

      {number}

    </div>

  );

}



function FieldLabel({ children }: { children: React.ReactNode }) {

  return <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{children}</label>;

}



function CheckLine({ children }: { children: React.ReactNode }) {

  return (

    <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">

      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">

        <Check size={9} strokeWidth={3} />

      </span>

      {children}

    </div>

  );

}



/* -------------------------------------------------------------------------- */

/* PAGE                                                                       */

/* -------------------------------------------------------------------------- */



export default function DemoBookingPage() {

  const [classNumber, setClassNumber] = useState(8);

  const [board, setBoard] = useState<BoardId>("CBSE");

  const [programId, setProgramId] = useState<ProgramId>("MATH_ONLY");

  const [demoType, setDemoType] = useState<DemoType>("GROUP");

  const [bookingDate, setBookingDate] = useState(localDate(1));

  const [existingBatchId, setExistingBatchId] = useState<string | undefined>();
  const [slotId, setSlotId] = useState<SlotId>("18_19");

  const [studentName, setStudentName] = useState("");

  const [phone, setPhone] = useState("");



  const [authOpen, setAuthOpen] = useState(false);

  const [authMode, setAuthMode] = useState<AuthMode>("GOOGLE");

  const [authEmail, setAuthEmail] = useState("");

  const [authPassword, setAuthPassword] = useState("");

  const [verificationSent, setVerificationSent] = useState(false);

  const [authMessage, setAuthMessage] = useState("");



  const [loading, setLoading] = useState(false);

  const [authLoading, setAuthLoading] = useState(false);

  const [paymentLoading, setPaymentLoading] = useState(false);

  const [error, setError] = useState("");

  const [info, setInfo] = useState("");

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const [finding, setFinding] = useState(false);

  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);



  const program = useMemo(() => getProgram(programId), [programId]);

  const slot = useMemo(() => getSlot(slotId), [slotId]);

  const platform = usePlatformSettings();

  const isOfferActive = !demoPrice(platform).paymentRequired;

  const regularPrice = platform.demoFee;

  const price = demoPrice(platform).finalPrice;



  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, (user) => {

      if (user) setAuthOpen(false);

    });

    return unsubscribe;

  }, []);



  useEffect(() => {

    const requestedProgram = new URLSearchParams(window.location.search).get("programId");

    if (requestedProgram === "MATH_ONLY" || requestedProgram === "ENGLISH_ONLY" || requestedProgram === "ALL_SUBJECTS") {

      setProgramId(requestedProgram);

    }

  }, []);



  /* ------------------------------------------------------------------------ */

  /* PROFILE                                                                  */

  /* ------------------------------------------------------------------------ */



  async function ensureStudentProfile(user: User) {

    const userRef = doc(db, "users", user.uid);

    const userSnap = await getDoc(userRef);



    if (userSnap.exists()) {

      const existing = userSnap.data();

      if (existing.role && existing.role !== "STUDENT") {

        throw new Error("This account is not a student account.");

      }

    }



    const cleanPhone = phone.replace(/\D/g, "");

    const name = studentName.trim() || user.displayName || "Student";



    await setDoc(

      userRef,

      {

        uid: user.uid,

        name,

        email: user.email ?? null,

        phone: cleanPhone ? `+91${cleanPhone}` : null,

        photoURL: user.photoURL ?? null,

        role: "STUDENT",

        updatedAt: serverTimestamp(),

      },

      { merge: true },

    );



    await setDoc(

      doc(db, "students", user.uid),

      {

        uid: user.uid,

        name,

        email: user.email ?? null,

        phone: cleanPhone ? `+91${cleanPhone}` : null,

        classNumber,

        board,

        role: "STUDENT",

        updatedAt: serverTimestamp(),

      },

      { merge: true },

    );



    const token = await user.getIdToken(true);

    document.cookie = `__session=${token}; path=/; max-age=86400; SameSite=Lax`;

    document.cookie = "user_role=STUDENT; path=/; max-age=86400; SameSite=Lax";



    return user;

  }



  /* ------------------------------------------------------------------------ */

  /* BOOKING                                                                  */

  /* ------------------------------------------------------------------------ */



  async function fetchSuggestions() {

    setFinding(true);

    setError("");



    try {

      const response = await fetch("/api/demo/availability", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({

          classNumber,

          board,

          programId,

          demoType,

          date: bookingDate,

        }),

      });



      const data = await readApiResponse(response);



      if (!response.ok || !data.success) {

        throw new Error(data.message || "Unable to find available slots.");

      }



      setSuggestions(data.suggestions ?? []);



      if (!data.suggestions?.length) {

        setError("No compatible mentor is available in the next 14 days for this combination.");

      }

    } catch (e: any) {

      setError(e?.message || "Unable to find available slots.");

    } finally {

      setFinding(false);

    }

  }



  useEffect(() => {
    setExistingBatchId(undefined);
    const timer = window.setTimeout(() => { void fetchSuggestions(); }, 350);
    return () => window.clearTimeout(timer);
  }, [classNumber, board, programId, demoType, bookingDate]);

  async function processBooking(user: User) {

    if (loading) return;



    setLoading(true);

    setError("");

    setInfo("");

    setSuggestions([]);



    try {

      const token = await user.getIdToken(true);



      const response = await fetch("/api/demo/book", {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`,

        },

        credentials: "include",

        body: JSON.stringify({

          studentName: studentName.trim(),

          classNumber,

          board,

          programId,

          demoType,

          date: bookingDate,

          slotId,
          existingBatchId,

          phone: phone.replace(/\D/g, ""),

          ...(isOfferActive ? { couponCode: "WELCOME" } : {}),

        }),

      });



      const data = (await readApiResponse(response)) as BookingResponse;



      if (response.ok && data.success && data.pendingAllocation) { window.location.assign("/hub"); return; }
      if (!response.ok || !data.success || !data.booking || !data.pricing) {

        if (data.code === "NO_EXACT_MATCH") {

          setInfo("That exact time is unavailable. Finding the closest compatible slots...");

          await fetchSuggestions();

          return;

        }

        throw new Error(data.message || data.errors?.[0] || "Unable to secure this demo.");

      }



      if (!data.pricing.paymentRequired || data.pricing.finalPrice === 0) {

        trackConversion("demo_booked", {id:data.booking.id,value:0,product:"demo"});

        setConfirmation({

          bookingId: data.booking.id,

          batchId: data.booking.batchId,

          teacherName: data.teacher?.name || "Assigned Mentor",

          teacherId: data.booking.teacherId,

          date: data.booking.date,

          sessionDates: data.booking.sessionDates || [data.booking.date],

          startTime: data.booking.startTime,

          endTime: data.booking.endTime,

          finalPrice: data.pricing.finalPrice,

          enrolledCount: data.batch?.enrolledCount ?? 1,

          capacity: data.batch?.capacity ?? (demoType === "GROUP" ? 5 : 1),

        });

        return;

      }



      if (typeof window === "undefined" || !window.Razorpay) {

        throw new Error("Payment gateway is still loading. Your booking is saved; open your dashboard to complete payment.");

      }



      setPaymentLoading(true);



      const orderResponse = await fetch("/api/razorpay/order", {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`,

        },

        credentials: "include",

        body: JSON.stringify({ bookingId: data.booking.id }),

      });



      const order = (await readApiResponse(orderResponse)) as RazorpayOrderResponse;



      if (!orderResponse.ok || !order.success || !order.orderId || !order.keyId || typeof order.amount !== "number") {

        throw new Error(order.message || "Unable to start payment.");

      }



      trackConversion("begin_checkout", {id:order.orderId,value:order.amount,product:"demo"});

      const razorpay = new window.Razorpay({

        key: order.keyId,

        amount: toPaise(order.amount),

        currency: order.currency || "INR",

        name: "BlankLearn",

        description: `3-day demo / ${program.title} · ${classLabel(classNumber)} Demo`,

        order_id: order.orderId,

        prefill: {

          name: studentName.trim(),

          email: user.email || undefined,

          contact: phone.replace(/\D/g, "") || undefined,

        },

        notes: { bookingId: data.booking.id },

        theme: { color: "#4f46e5" },

        modal: {

          ondismiss: () => {

            setPaymentLoading(false);

            setLoading(false);

            setInfo("Payment not completed. Your booking is saved. Open your dashboard to retry payment.");

          },

        },

       handler: async (payment: RazorpayPaymentResponse) => {

  try {

    if (!data.booking) {

      throw new Error("Booking was not created.");

    }



    if (!data.pricing) {

      throw new Error("Booking pricing is missing.");

    }



    const booking = data.booking;

    const pricing = data.pricing;



    const verifyResponse = await fetch("/api/razorpay/verify", {

      method: "POST",

      headers: {

        "Content-Type": "application/json",

        Authorization: `Bearer ${token}`,

      },

      credentials: "include",



      body: JSON.stringify({

        bookingId: booking.id,

        razorpayOrderId: payment.razorpay_order_id,

        razorpayPaymentId: payment.razorpay_payment_id,

        razorpaySignature: payment.razorpay_signature,

      }),

    });



    const verifyData = await readApiResponse(verifyResponse);



    if (!verifyResponse.ok || !verifyData.success) {

      throw new Error(

        verifyData.message || "Payment verification failed."

      );

    }



    trackConversion("purchase", {id:payment.razorpay_order_id,value:order.amount!,product:"demo"});

    trackConversion("demo_booked", {id:booking.id,value:order.amount!,product:"demo"});

    setConfirmation({

      bookingId: booking.id,

      batchId: booking.batchId,

      teacherName: data.teacher?.name || "Assigned Mentor",

      teacherId: booking.teacherId,

      date: booking.date,

      sessionDates: booking.sessionDates || [booking.date],

      startTime: booking.startTime,

      endTime: booking.endTime,

      finalPrice: pricing.finalPrice,

      enrolledCount: data.batch?.enrolledCount ?? 1,

      capacity:

        data.batch?.capacity ?? (demoType === "GROUP" ? 5 : 1),

    });

  } catch (e: any) {

    setError(

      e?.message || "Payment verification failed."

    );

  } finally {

    setPaymentLoading(false);

    setLoading(false);

  }

},

      });



      razorpay.open();

    } catch (e: any) {

      setError(e?.message || "Unable to complete booking.");

    } finally {

      if (!paymentLoading) setLoading(false);

    }

  }



  /* ------------------------------------------------------------------------ */

  /* AUTH                                                                     */

  /* ------------------------------------------------------------------------ */



  async function continueAfterAuth(user: User) {

    await ensureStudentProfile(user);

    setAuthOpen(false);

    setVerificationSent(false);

    setAuthMessage("");

    await processBooking(user);

  }



  async function handleGoogle() {

    if (authLoading) return;

    setAuthMode("GOOGLE");

    setAuthLoading(true);

    setAuthMessage("");

    setError("");



    try {

      const provider = new GoogleAuthProvider();

      provider.setCustomParameters({ prompt: "select_account" });

      const result = await signInWithPopup(auth, provider);

      await continueAfterAuth(result.user);

    } catch (e: any) {

      if (e?.code === "auth/popup-closed-by-user") {

        setAuthMessage("Google sign-in was cancelled.");

      } else {

        setAuthMessage(e?.message || "Unable to continue with Google.");

      }

    } finally {

      setAuthLoading(false);

    }

  }



  async function handleEmail() {

    if (authLoading) return;

    setAuthMode("EMAIL");

    setAuthLoading(true);

    setAuthMessage("");

    setError("");



    const email = authEmail.trim();



    if (!email) {

      setAuthMessage("Enter your email address.");

      setAuthLoading(false);

      return;

    }



    if (authPassword.length < 6) {

      setAuthMessage("Password must be at least 6 characters.");

      setAuthLoading(false);

      return;

    }



    try {

      let user: User;



      try {

        const credential = await signInWithEmailAndPassword(auth, email, authPassword);

        user = credential.user;

      } catch (loginError: any) {

        if (loginError?.code !== "auth/user-not-found" && loginError?.code !== "auth/invalid-credential") {

          throw loginError;

        }



        try {

          const credential = await createUserWithEmailAndPassword(auth, email, authPassword);

          user = credential.user;



          await updateProfile(user, {

            displayName: studentName.trim() || "Student",

          });



          await sendEmailVerification(user);

          setVerificationSent(true);

          setAuthMessage(`Verification email sent to ${email}. Verify it and then continue.`);

          return;

        } catch (signupError: any) {

          if (signupError?.code === "auth/email-already-in-use") {

            throw new Error("This email already has an account. Sign in with its password.");

          }

          throw signupError;

        }

      }



      if (!user.emailVerified) {

        await sendEmailVerification(user);

        setVerificationSent(true);

        setAuthMessage(`Please verify ${email} before booking.`);

        return;

      }



      await continueAfterAuth(user);

    } catch (e: any) {

      const message =

        e?.code === "auth/invalid-email"

          ? "Please enter a valid email address."

          : e?.code === "auth/weak-password"

            ? "Password must be at least 6 characters."

            : e?.message || "Unable to continue.";

      setAuthMessage(message);

    } finally {

      setAuthLoading(false);

    }

  }



  async function handleVerified() {

    if (authLoading) return;

    setAuthLoading(true);

    setAuthMessage("");



    try {

      const current = auth.currentUser;

      if (!current) throw new Error("Your session ended. Please sign in again.");



      await current.reload();

      const refreshed = auth.currentUser;



      if (!refreshed?.emailVerified) {

        setAuthMessage("Email is not verified yet. Please verify it first.");

        return;

      }



      await continueAfterAuth(refreshed);

    } catch (e: any) {

      setAuthMessage(e?.message || "Unable to verify the account.");

    } finally {

      setAuthLoading(false);

    }

  }



  /* ------------------------------------------------------------------------ */

  /* SUBMIT                                                                   */

  /* ------------------------------------------------------------------------ */



  async function submit(event: FormEvent) {

    event.preventDefault();

    setError("");

    setInfo("");

    setSuggestions([]);



    if (studentName.trim().length < 2) {

      setError("Please enter the student's name.");

      return;

    }



    if (phone.replace(/\D/g, "").length !== 10) {

      setError("Please enter a valid 10-digit WhatsApp number.");

      return;

    }



    if (!bookingDate) {

      setError("Please select a date.");

      return;

    }



    if (new Date(`${bookingDate}T23:59:59`) < new Date()) {

      setError("Please select a future date.");

      return;

    }



    const current = auth.currentUser;



    if (!current) {

      setAuthMode("GOOGLE");

      setAuthOpen(true);

      setAuthMessage("");

      return;

    }



    if (current.providerData.some((p) => p.providerId === "password") && !current.emailVerified) {

      setAuthMode("EMAIL");

      setVerificationSent(true);

      setAuthOpen(true);

      setAuthMessage("Please verify your email before booking.");

      return;

    }



    try {

      await continueAfterAuth(current);

    } catch (e: any) {

      setError(e?.message || "Unable to continue.");

    }

  }



  /* ------------------------------------------------------------------------ */

  /* CONFIRMATION                                                             */

  /* ------------------------------------------------------------------------ */



  if (confirmation) {

    return (

      <>

        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

        <main className="min-h-screen bg-[#f7f8fc] px-4 py-8 sm:px-6">

          <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl items-center">

            <div className="w-full overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,.10)] animate-[fadeIn_.5s_ease-out]">

              <div className="relative overflow-hidden bg-slate-950 px-6 py-12 text-center text-white sm:px-10">

                <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-indigo-600/30 blur-3xl" />

                <div className="absolute -bottom-24 -right-10 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />

                <div className="relative mx-auto flex h-18 w-18 animate-[pop_.45s_ease-out] items-center justify-center rounded-full bg-emerald-500 shadow-2xl shadow-emerald-500/30">

                  <CheckCircle2 size={38} />

                </div>

                <p className="relative mt-6 text-[10px] font-black uppercase tracking-[.24em] text-emerald-400">Demo confirmed</p>

                <h1 className="relative mt-2 text-3xl font-black tracking-tight sm:text-4xl">You're all set.</h1>

                <p className="relative mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">Your demo has been securely booked with a compatible BlankLearn mentor.</p>

              </div>



              <div className="space-y-5 p-6 sm:p-8">

                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">

                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Booking ID</span>

                  <span className="font-mono text-xs font-black text-slate-800">#{confirmation.bookingId.slice(-10)}</span>

                </div>



                <div className="grid gap-3 sm:grid-cols-2">

                  <InfoCard label="Student" value={studentName} />

                  <InfoCard label="Class & Board" value={`${classLabel(classNumber)} · ${BOARDS.find((b) => b.id === board)?.name}`} />

                  <InfoCard label="Program" value={program.title} />

                  <InfoCard label="Format" value={demoType === "GROUP" ? `1:5 Group · ${confirmation.enrolledCount}/${confirmation.capacity}` : "1:1 Individual"} />

                </div>



                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">

                  <div className="flex items-center gap-2 text-slate-600"><CalendarDays size={15} /><span className="text-[9px] font-black uppercase tracking-wider">Scheduled</span></div>

                  <p className="mt-2 text-xs font-bold text-slate-800">Three live sessions · one each day</p>

                  <div className="mt-3 grid gap-2 sm:grid-cols-3">{confirmation.sessionDates.map((sessionDate, index) => <div key={sessionDate} className="rounded-xl border border-slate-100 bg-white px-3 py-2.5"><p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Day {index + 1}</p><p className="mt-1 text-xs font-black text-slate-900">{formatDate(sessionDate)}</p><p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-500"><Clock3 size={11} />{confirmation.startTime} – {confirmation.endTime}</p></div>)}</div>

                </div>



                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-slate-600"><GraduationCap size={20} /></div>

                  <div><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Mentor</p><p className="mt-1 text-sm font-black text-slate-900">{confirmation.teacherName}</p></div>

                </div>



                <div className="flex items-center justify-between border-t border-slate-100 pt-5">

                  <span className="text-xs font-bold text-slate-500">Demo fee / all 3 days</span>

                  <span className="text-lg font-black text-slate-950">{confirmation.finalPrice === 0 ? "FREE" : formatPrice(confirmation.finalPrice)}</span>

                </div>



                <div className="rounded-2xl bg-slate-50 p-4">

                  <CheckLine>Account verified</CheckLine>

                  <CheckLine>Class, board and program matched</CheckLine>

                  <CheckLine>Compatible mentor assigned</CheckLine>

                  <CheckLine>{demoType === "GROUP" ? "Group capped at 5 students" : "Dedicated 1:1 session"}</CheckLine>

                </div>

              </div>

            </div>

          </div>

        </main>

      </>

    );

  }



  return (

    <>

      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />



      <main className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f8faff_0%,#f5f7fb_42%,#ffffff_100%)] text-slate-900">

        {/* ambient background */}

        <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">

          <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-slate-200/25 blur-3xl" />

          <div className="absolute -right-40 top-1/3 h-[30rem] w-[30rem] rounded-full bg-slate-200/20 blur-3xl" />

        </div>



        <section className="relative z-10 px-4 pb-16 pt-6 sm:px-6 sm:pt-10">

          <div className="mx-auto max-w-[1240px]">

            {/* top brand */}

            <div className="mb-7 flex items-center justify-between">

              <div>

                <div className="flex items-center gap-2.5">

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-200"><Sparkles size={16} /></div>

                  <span className="text-sm font-black tracking-tight text-slate-950">BlankLearn</span>

                </div>

              </div>

              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-[9px] font-bold text-slate-500 shadow-sm backdrop-blur sm:flex">

                <ShieldCheck size={12} className="text-emerald-600" /> Secure demo booking

              </div>

            </div>



            {/* hero */}

            <div className="mb-7 grid gap-5 lg:grid-cols-[1.25fr_.75fr] lg:items-end">

              <div>

                <div className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-white px-3 py-1.5 text-[9px] font-black uppercase tracking-[.16em] text-slate-600 shadow-sm">

                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live mentor matching

                </div>

                <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.03] tracking-[-.045em] text-slate-950 sm:text-5xl lg:text-[58px]">

                  Find the right mentor.<br /><span className="text-indigo-600">Try a class first.</span>

                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">Tell us what your child needs. BlankLearn checks class, board, program, teaching format, date and time before assigning a compatible mentor.</p>

              </div>

              <div className="hidden lg:block">

                <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">

                  <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><ShieldCheck size={19} /></div><div><p className="text-xs font-black">Matching happens on the server</p><p className="mt-1 text-[10px] text-slate-400">Your selections are checked before a booking is created.</p></div></div>

                </div>

              </div>

            </div>



            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">

              {/* form */}

              <form onSubmit={submit} className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,.08)] backdrop-blur-xl">

                <div className="border-b border-slate-100 px-5 py-4 sm:px-7">

                  <div className="flex items-center gap-2">

                    <StepPill number="01" active /><div className="h-px flex-1 bg-slate-100" /><StepPill number="02" active /><div className="h-px flex-1 bg-slate-100" /><StepPill number="03" active /><div className="h-px flex-1 bg-slate-100" /><StepPill number="04" active /><div className="h-px flex-1 bg-slate-100" /><StepPill number="05" active />

                  </div>

                </div>



                <div className="space-y-0 p-5 sm:p-8">

                  {/* 01 */}

                  <section>

                    <div className="flex items-start gap-3"><StepPill number="01" active /><div><h2 className="text-base font-black tracking-tight text-slate-950">Student basics</h2><p className="mt-1 text-[10px] font-semibold text-slate-400">Select the class and curriculum.</p></div></div>



                    <div className="mt-5"><FieldLabel>Class</FieldLabel><div className="grid grid-cols-5 gap-2 sm:grid-cols-10">{Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <button key={n} type="button" onClick={() => setClassNumber(n)} className={`h-10 rounded-xl border text-xs font-black transition-all duration-200 ${classNumber === n ? "-translate-y-0.5 border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-slate-100" : "border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_8px_24px_rgba(79,70,229,.08)]"}`}>{n}</button>)}</div></div>



                    <div className="mt-5"><FieldLabel>Board</FieldLabel><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{BOARDS.map((item) => <button key={item.id} type="button" onClick={() => setBoard(item.id)} className={`group rounded-2xl border p-3.5 text-left transition-all duration-200 ${board === item.id ? "border-indigo-500 bg-white shadow-sm" : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_10px_28px_rgba(79,70,229,.08)]"}`}><div className="flex items-center justify-between"><p className="text-xs font-black">{item.name}</p>{board === item.id && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white"><Check size={11} /></span>}</div><p className="mt-1 text-[9px] text-slate-400">{item.description}</p></button>)}</div></div>

                  </section>



                  <div className="my-9 h-px bg-slate-200/70" />



                  {/* 02 */}

                  <section>

                    <div className="flex items-start gap-3"><StepPill number="02" active /><div><h2 className="text-base font-black tracking-tight text-slate-950">Choose your demo program</h2><p className="mt-1 text-[10px] font-semibold text-slate-400">Pick what you want the mentor to cover.</p></div></div>

                    <div className="mt-5 space-y-2.5">{PROGRAMS.map((item) => { const active = programId === item.id; return <button key={item.id} type="button" onClick={() => setProgramId(item.id)} className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ${active ? "border-indigo-500 bg-white shadow-sm" : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_10px_28px_rgba(79,70,229,.08)]"}`}><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${active ? "bg-indigo-600 text-white" : "bg-white text-slate-400"}`}>{active ? <Check size={17} /> : <Sparkles size={17} />}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="text-xs font-black">{item.title}</p><span className="text-[8px] font-black uppercase tracking-wider text-slate-400">60 min</span></div><p className="mt-1 text-[10px] leading-5 text-slate-500">{item.description}</p><div className="mt-2 flex flex-wrap gap-1">{item.subjects.map((s) => <span key={s} className="rounded-full bg-white px-2 py-1 text-[8px] font-bold text-slate-500">{s}</span>)}</div></div><ChevronRight size={16} className={active ? "text-slate-600" : "text-slate-300"} /></button>})}</div>

                  </section>



                  <div className="my-9 h-px bg-slate-200/70" />



                  {/* 03 */}

                  <section>

                    <div className="flex items-start gap-3"><StepPill number="03" active /><div><h2 className="text-base font-black tracking-tight text-slate-950">Choose the learning format</h2><p className="mt-1 text-[10px] font-semibold text-slate-400">We only place students with compatible capacity.</p></div></div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">

                      <button type="button" onClick={() => setDemoType("GROUP")} className={`rounded-2xl border p-4 text-left transition-all duration-200 ${demoType === "GROUP" ? "border-indigo-500 bg-white shadow-sm" : "border-slate-200 bg-white hover:border-indigo-200 hover:shadow-[0_10px_28px_rgba(79,70,229,.08)]"}`}><div className="flex items-center justify-between"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${demoType === "GROUP" ? "bg-indigo-600 text-white" : "bg-white text-slate-400"}`}><Users size={18} /></div>{demoType === "GROUP" && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white"><Check size={12} /></span>}</div><p className="mt-4 text-xs font-black">1:5 Group</p><p className="mt-1 text-[10px] leading-5 text-slate-500">A small live group with up to five compatible students.</p><span className="mt-3 inline-flex rounded-full bg-white px-2.5 py-1 text-[8px] font-black text-slate-600">MAX 5</span></button>

                      <button type="button" onClick={() => setDemoType("INDIVIDUAL")} className={`rounded-2xl border p-4 text-left transition-all duration-200 ${demoType === "INDIVIDUAL" ? "border-indigo-500 bg-white shadow-sm" : "border-slate-200 bg-white hover:border-indigo-200 hover:shadow-[0_10px_28px_rgba(79,70,229,.08)]"}`}><div className="flex items-center justify-between"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${demoType === "INDIVIDUAL" ? "bg-indigo-600 text-white" : "bg-white text-slate-400"}`}><UserRound size={18} /></div>{demoType === "INDIVIDUAL" && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white"><Check size={12} /></span>}</div><p className="mt-4 text-xs font-black">1:1 Individual</p><p className="mt-1 text-[10px] leading-5 text-slate-500">A dedicated mentor session with no group mixing.</p><span className="mt-3 inline-flex rounded-full bg-white px-2.5 py-1 text-[8px] font-black text-slate-600">SOLO</span></button>

                    </div>

                  </section>



                  <div className="my-9 h-px bg-slate-200/70" />



                  {/* 04 */}

                  <section>

                    <div className="flex items-start gap-3"><StepPill number="04" active /><div><h2 className="text-base font-black tracking-tight text-slate-950">Pick a convenient time</h2><p className="mt-1 text-[10px] font-semibold text-slate-400">If your exact slot is unavailable, we'll suggest compatible alternatives.</p></div></div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">

                      <div><FieldLabel>Date</FieldLabel><div className="flex h-12 items-center rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_16px_rgba(15,23,42,.035)] px-3.5 transition focus-within:border-indigo-500 focus-within:bg-white"><CalendarDays size={15} className="mr-2 text-slate-600" /><input type="date" min={localDate()} value={bookingDate} onChange={(e) => { setBookingDate(e.target.value); setSuggestions([]); setInfo(""); setError(""); }} className="w-full bg-transparent text-xs font-bold outline-none" /></div></div>

                      <div><FieldLabel>Preferred time</FieldLabel><div className="flex h-12 items-center rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_16px_rgba(15,23,42,.035)] px-3.5 transition focus-within:border-indigo-500 focus-within:bg-white"><Clock3 size={15} className="mr-2 text-slate-600" /><select value={slotId} onChange={(e) => { setExistingBatchId(undefined); setSlotId(e.target.value as SlotId); setSuggestions([]); setInfo(""); setError(""); }} className="w-full bg-transparent text-xs font-bold outline-none">{SLOTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div></div>

                    </div>

                    <div className="mt-3 flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3"><Clock3 size={13} className="text-slate-600" /><span className="text-[10px] text-slate-500">Selected:</span><span className="text-[10px] font-black">{formatDate(bookingDate)} · {slot.label}</span></div>



                    {(finding || suggestions.length > 0) && <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/60 p-4 animate-[fadeIn_.25s_ease-out]">{finding ? <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white"><RefreshCw size={15} className="animate-spin" /></div><div><p className="text-xs font-black">Finding compatible slots…</p><p className="mt-1 text-[9px] text-slate-500">Checking class, board, program, mentor and capacity.</p></div></div> : <><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black">Choose an existing batch or a new slot</p><p className="mt-1 text-[9px] leading-4 text-slate-500">These options have compatible mentor availability.</p></div><button type="button" onClick={() => setSuggestions([])} className="text-slate-400 hover:text-slate-700"><X size={15} /></button></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{suggestions.map((s) => <button key={`${s.date}-${s.slotId}`} type="button" onClick={() => { setExistingBatchId(s.batches?.[0]?.id); setBookingDate(s.date); setSlotId(s.slotId); setSuggestions([]); setInfo("Slot selected. You're ready to secure the demo."); }} className="flex items-center justify-between rounded-xl border border-white bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"><div><p className="text-[10px] font-black">{formatDate(s.date)}</p><p className="mt-1 text-[9px] font-semibold text-slate-500">{s.label}{s.batches?.[0] ? ` ? ${s.batches[0].enrolledCount}/${s.batches[0].capacity} students ? ${s.batches[0].teacherName}` : " ? New slot"}</p></div><ArrowRight size={14} className="text-slate-600" /></button>)}</div></>}</div>}

                  </section>



                  <div className="my-9 h-px bg-slate-200/70" />



                  {/* 05 */}

                  <section>

                    <div className="flex items-start gap-3"><StepPill number="05" active /><div><h2 className="text-base font-black tracking-tight text-slate-950">Student details</h2><p className="mt-1 text-[10px] font-semibold text-slate-400">Your account is created or checked before the booking is submitted.</p></div></div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">

                      <div><FieldLabel>Student name</FieldLabel><div className="flex h-12 items-center rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_16px_rgba(15,23,42,.035)] px-3.5 transition focus-within:border-indigo-500 focus-within:bg-white"><UserRound size={15} className="mr-2 text-slate-600" /><input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Student's full name" className="w-full bg-transparent text-xs font-bold outline-none placeholder:text-slate-400" /></div></div>

                      <div><FieldLabel>WhatsApp number</FieldLabel><div className="flex h-12 items-center rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_16px_rgba(15,23,42,.035)] px-3.5 transition focus-within:border-indigo-500 focus-within:bg-white"><MessageCircle size={15} className="mr-2 text-slate-600" /><span className="mr-2 text-xs font-black text-slate-500">+91</span><input inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="9876543210" className="w-full bg-transparent text-xs font-bold outline-none placeholder:text-slate-400" /></div></div>

                    </div>

                    <div className="mt-3 flex items-start gap-2 rounded-2xl bg-emerald-50 px-4 py-3"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-600" /><p className="text-[9px] leading-4 text-emerald-700">This number is used only for demo confirmation and class updates. <strong>No sales calls.</strong></p></div>

                  </section>



                  {(error || info) && <div className={`mt-6 rounded-2xl border p-4 ${error ? "border-rose-200 bg-rose-50" : "border-slate-100 bg-slate-50"}`}><div className="flex gap-3"><div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${error ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-600"}`}>{error ? <X size={14} /> : <Sparkles size={14} />}</div><p className={`text-[10px] leading-5 ${error ? "text-rose-700" : "text-slate-700"}`}>{error || info}</p></div></div>}



                  <div className="mt-7 rounded-[26px] bg-gradient-to-br from-[#111936] via-[#172554] to-[#1e1b4b] p-5 text-white shadow-[0_18px_45px_rgba(30,41,90,.18)] sm:p-6">

                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                      <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-500">Demo fee</p><div className="mt-1 flex items-center gap-2"><span className="text-2xl font-black">{price === 0 ? "FREE" : formatPrice(price)}</span>{isOfferActive && <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[8px] font-black text-emerald-300">OFFER ACTIVE</span>}</div><p className="mt-1 text-[9px] text-slate-500">One payment covers 3 live sessions, one per day.</p></div>

                      <button type="submit" disabled={loading || finding} className="group flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 text-xs font-black shadow-xl shadow-indigo-950/20 transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />{paymentLoading ? "Opening payment…" : "Securing demo…"}</> : <>Secure my demo <ArrowRight size={15} className="transition group-hover:translate-x-0.5" /></>}</button>

                    </div>

                    <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 text-[9px] font-semibold text-slate-500"><LockKeyhole size={11} /> Secure authentication · Server-side mentor matching · Protected payment verification</div>

                  </div>

                </div>

              </form>



              {/* summary */}

              <aside className="lg:sticky lg:top-5">

                <div className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,.08)] backdrop-blur-xl">

                  <div className="relative overflow-hidden bg-gradient-to-br from-[#101936] via-[#172554] to-[#312e81] p-6 text-white"><div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-indigo-600/30 blur-3xl" /><div className="relative"><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10"><Sparkles size={14} /></div><span className="text-[9px] font-black uppercase tracking-[.18em] text-slate-400">Demo preview</span></div><h2 className="mt-5 text-xl font-black tracking-tight">A simple first class.<br /><span className="text-indigo-400">Matched properly.</span></h2><p className="mt-2 text-[10px] leading-5 text-slate-400">We use your selections to check compatible mentor eligibility and capacity before creating the booking.</p></div></div>

                  <div className="space-y-4 p-5">

                    <Summary label="Class" value={classLabel(classNumber)} />

                    <Summary label="Board" value={BOARDS.find((b) => b.id === board)?.name ?? board} />

                    <Summary label="Program" value={program.title} />

                    <Summary label="Format" value={demoType === "GROUP" ? "1:5 Group" : "1:1 Individual"} />

                    <Summary label="Date" value={formatDate(bookingDate)} />

                    <Summary label="Time" value={slot.label} />

                    <div className="h-px bg-slate-100" />

                    <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">Demo fee</span><span className="text-lg font-black">{price === 0 ? "FREE" : formatPrice(price)}</span></div>

                    <div className="space-y-2 rounded-2xl bg-slate-50 p-4"><CheckLine>Student account verified</CheckLine><CheckLine>Class & board matched</CheckLine><CheckLine>Compatible mentor</CheckLine><CheckLine>{demoType === "GROUP" ? "Maximum 5 students" : "Dedicated 1:1"}</CheckLine><CheckLine>Secure booking</CheckLine></div>

                  </div>

                </div>

                <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4"><div className="flex gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600"><LockKeyhole size={14} /></div><div><p className="text-[10px] font-black">Why an account?</p><p className="mt-1 text-[9px] leading-4 text-slate-400">Your account owns the booking and lets you access class details later.</p></div></div></div>

              </aside>

            </div>

          </div>

        </section>

      </main>



      {/* ------------------------------------------------------------------ */}

      {/* AUTH MODAL                                                         */}

      {/* ------------------------------------------------------------------ */}

      {authOpen && (

        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-md sm:items-center sm:p-4">

          <button type="button" aria-label="Close" className="absolute inset-0 cursor-default" onClick={() => !authLoading && setAuthOpen(false)} />

          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-t-[32px] border border-white/20 bg-white shadow-[0_35px_120px_rgba(15,23,42,.35)] sm:rounded-[32px] animate-[slideUp_.35s_ease-out]">

            <div className="relative overflow-hidden bg-slate-950 px-6 pb-7 pt-6 text-white"><div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-indigo-600/30 blur-3xl" /><button type="button" onClick={() => !authLoading && setAuthOpen(false)} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white"><X size={15} /></button><div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 shadow-xl shadow-slate-950/30"><ShieldCheck size={20} /></div><p className="relative mt-5 text-[9px] font-black uppercase tracking-[.18em] text-slate-300">One quick step</p><h2 className="relative mt-1 text-2xl font-black tracking-tight">Secure your demo</h2><p className="relative mt-2 text-[10px] leading-5 text-slate-400">Create or use your free BlankLearn account. Your booking is submitted only after authentication.</p></div>

            <div className="p-5 sm:p-6">

              {authMessage && <div className={`mb-4 rounded-2xl border p-3 ${verificationSent ? "border-slate-100 bg-slate-50" : "border-amber-200 bg-amber-50"}`}><div className="flex gap-2.5"><Mail size={15} className={verificationSent ? "mt-0.5 text-slate-600" : "mt-0.5 text-amber-600"} /><p className={`text-[10px] leading-5 ${verificationSent ? "text-slate-700" : "text-amber-700"}`}>{authMessage}</p></div></div>}



              {verificationSent ? <div className="text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-600"><Mail size={26} /></div><h3 className="mt-4 text-sm font-black">Check your inbox</h3><p className="mx-auto mt-2 max-w-xs text-[10px] leading-5 text-slate-400">Verify your email, then come back and continue. We will re-check Firebase before creating the booking.</p><button type="button" disabled={authLoading} onClick={handleVerified} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-xs font-black text-white shadow-lg shadow-slate-100 hover:bg-slate-800 disabled:opacity-60">{authLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Check size={15} />} I've verified my email</button><button type="button" disabled={authLoading} onClick={() => { setVerificationSent(false); setAuthMessage(""); }} className="mt-3 w-full text-[10px] font-bold text-slate-400 hover:text-slate-700">Use another sign-in method</button></div> : <><button type="button" disabled={authLoading} onClick={handleGoogle} className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-xs font-black shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60">{authLoading && authMode === "GOOGLE" ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" /> : <GoogleIcon />} Continue with Google</button><div className="my-5 flex items-center gap-3"><div className="h-px flex-1 bg-slate-100" /><span className="text-[8px] font-black uppercase tracking-wider text-slate-300">or email</span><div className="h-px flex-1 bg-slate-100" /></div><div className="space-y-3"><div><FieldLabel>Email address</FieldLabel><div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-indigo-500 focus-within:bg-white"><Mail size={14} className="mr-2 text-slate-400" /><input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="you\@example.com" className="w-full bg-transparent text-xs font-semibold outline-none placeholder:text-slate-400" /></div></div><div><FieldLabel>Password</FieldLabel><input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="At least 6 characters" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white" /></div><button type="button" disabled={authLoading} onClick={handleEmail} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-60">{authLoading && authMode === "EMAIL" ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : <>Continue with Email <ArrowRight size={14} /></>}</button></div><div className="mt-5 flex items-start gap-2 rounded-xl bg-slate-50 p-3"><LockKeyhole size={12} className="mt-0.5 shrink-0 text-slate-400" /><p className="text-[9px] leading-4 text-slate-400">We use your account to securely own this demo booking. Payment, if required, is verified on the server.</p></div></>}

            </div>

          </div>

        </div>

      )}



      <style jsx global>{`

        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        @keyframes pop { 0% { opacity: 0; transform: scale(.7); } 70% { transform: scale(1.08); } 100% { opacity: 1; transform: scale(1); } }

        @keyframes slideUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }

      `}</style>

    </>

  );

}



function Summary({ label, value }: { label: string; value: string }) {

  return <div className="flex items-start justify-between gap-4"><span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</span><span className="max-w-[190px] text-right text-[10px] font-black text-slate-800">{value}</span></div>;

}



function InfoCard({ label, value }: { label: string; value: string }) {

  return <div className="rounded-2xl border border-slate-200 p-4"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-xs font-black text-slate-900">{value}</p></div>;

}
