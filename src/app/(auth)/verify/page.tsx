"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { applyActionCode } from "firebase/auth";
import { ArrowRight, CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { auth } from "@/lib/firebase/client";

export default function EmailVerificationPage() {
  const [state, setState] = useState<"loading" | "success" | "invalid">("loading");
  const [message, setMessage] = useState("Checking your verification link…");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("oobCode");
    if (params.get("mode") !== "verifyEmail" || !code) {
      setState("invalid");
      setMessage("This email verification link is missing or expired. Sign in and request a new verification email.");
      return;
    }
    applyActionCode(auth, code).then(() => {
      setState("success");
      setMessage("Your email address is verified. You can now continue to BlankLearn.");
    }).catch((error) => {
      console.error("Email verification action failed", error);
      setState("invalid");
      setMessage("This verification link has expired or was already used. Sign in to request another one.");
    });
  }, []);
  return <main className="flex min-h-screen items-center justify-center bg-[#f4f7fb] px-4 py-10"><section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm"><div className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${state === "success" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}`}>{state === "loading" ? <Loader2 className="animate-spin" size={25}/> : state === "success" ? <CheckCircle2 size={25}/> : <MailCheck size={25}/>}</div><h1 className="mt-5 text-2xl font-black text-slate-950">{state === "success" ? "Email verified" : state === "loading" ? "Verifying email" : "Verification link unavailable"}</h1><p role="status" className="mt-2 text-sm leading-6 text-slate-600">{message}</p>{state !== "loading" && <Link href="/student-auth" className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">Continue to sign in <ArrowRight size={16}/></Link>}</section></main>;
}
