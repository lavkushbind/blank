"use client";
import { readApiResponse } from "@/lib/api-response";
import { trackConversion } from "@/lib/marketing/conversions";
import { toPaise } from "@/lib/payments/money";

import React, { useEffect, useState } from "react";
import { usePlatformSettings } from "@/lib/platform/client";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/lib/firebase/client";

type PlanType = "M1_D3" | "M1_D6" | "M3_D3" | "M3_D6" | "M6_D3" | "M6_D6";
type RazorpayOrder = { success?: boolean; message?: string; orderId?: string; amount?: number; currency?: string; keyId?: string };
type RazorpayPayment = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
declare global {
  interface Window {
    Razorpay: new (options: any) => { open: () => void };
  }
}

const plans: { id: PlanType; title: string; amount: number; regularAmount: number; detail: string }[] = [
  { id: "M1_D3", title: "1 Month · 3 days/week", amount: 1500, regularAmount: 1500, detail: "Monthly · 3 live classes each week" },
  { id: "M1_D6", title: "1 Month · 6 days/week", amount: 2500, regularAmount: 2500, detail: "Monthly · 6 live classes each week" },
  { id: "M3_D3", title: "3 Months · 3 days/week", amount: 4200, regularAmount: 4500, detail: "Demo offer · save ₹300" },
  { id: "M3_D6", title: "3 Months · 6 days/week", amount: 7000, regularAmount: 7500, detail: "Demo offer · save ₹500" },
  { id: "M6_D3", title: "6 Months · 3 days/week", amount: 8100, regularAmount: 9000, detail: "Demo offer · save ₹900" },
  { id: "M6_D6", title: "6 Months · 6 days/week", amount: 13500, regularAmount: 15000, detail: "Demo offer · save ₹1,500" },
];

export default function ParentBillingPage() {
  const router = useRouter();
  const platform = usePlatformSettings();
  const plans = Object.entries(platform.plans).map(([id,p]) => ({id:id as PlanType,title:`${p.months} months / ${p.classesPerWeek} days per week`,amount:platform.offersEnabled ? p.offer : p.regular,regularAmount:p.regular,detail:`${p.classesPerWeek} live class days per week. Total for ${p.months} months.`}));
  const [bookingId, setBookingId] = useState("");
  const [plan, setPlan] = useState<PlanType>("M1_D3");
  const [offerActive, setOfferActive] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setBookingId(params.get("bookingId") || "");
    const offerEndsAt = Number(params.get("offerEndsAt") || 0);
    setOfferActive(offerEndsAt > Date.now());
    const requestedPlan = params.get("plan") as PlanType | null;
    if (requestedPlan && plans.some((item) => item.id === requestedPlan)) setPlan(requestedPlan);
    return onAuthStateChanged(auth, (user) => {
      setSignedIn(Boolean(user));
      setAuthReady(true);
    });
  }, []);

  const startPayment = async () => {
    const user = auth.currentUser;
    if (!bookingId) return setMessage("Open this page from your trial class in the student hub.");
    if (!user) return setMessage("Sign in to the student account that owns this trial class.");
    if (!window.Razorpay) return setMessage("Payment gateway is loading. Please try again in a moment.");
    setBusy(true);
    setMessage("");
    try {
      const token = await user.getIdToken();
      const orderResponse = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingId, purchaseType: "COURSE_PURCHASE", planType: plan }),
      });
      const order = (await readApiResponse(orderResponse)) as RazorpayOrder;
      if (!orderResponse.ok || !order.success || !order.orderId || !order.amount || !order.keyId) {
        throw new Error(order.message || "Could not create a payment order.");
      }
      trackConversion("begin_checkout", {id:order.orderId,value:order.amount,product:plan});
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: toPaise(order.amount),
        currency: order.currency || "INR",
        name: "BlankLearn",
        description: `${selected.title} course enrollment`,
        order_id: order.orderId,
        theme: { color: "#4f46e5" },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (payment: RazorpayPayment) => {
          try {
            const verifyResponse = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
              body: JSON.stringify({
                bookingId,
                razorpayOrderId: payment.razorpay_order_id,
                razorpayPaymentId: payment.razorpay_payment_id,
                razorpaySignature: payment.razorpay_signature,
              }),
            });
            const verification = await readApiResponse(verifyResponse);
            if (!verifyResponse.ok || !verification.success) throw new Error(verification.message || "Payment verification failed.");
            trackConversion("purchase", {id:payment.razorpay_order_id,value:order.amount!,product:plan});
            setComplete(true);
            setMessage("Payment verified. Your existing trial class is now an active course enrollment.");
            setTimeout(() => router.replace("/hub"), 1400);
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Payment verification failed. Contact support if your payment was deducted.");
            setBusy(false);
          }
        },
      });
      checkout.open();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start payment.");
      setBusy(false);
    }
  };

  const selected = plans.find((item) => item.id === plan)!;
  const selectedAmount = offerActive ? selected.amount : selected.regularAmount;

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[.15em] text-indigo-600">Course enrollment</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Continue your trial class</h1>
          <p className="mt-2 text-sm text-slate-500">Choose a plan to activate the same batch and live classroom from your demo.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((item) => (
            <button key={item.id} type="button" onClick={() => setPlan(item.id)} className={`rounded-3xl border-2 p-6 text-left transition ${plan === item.id ? "border-indigo-600 bg-white shadow-lg shadow-indigo-100" : "border-slate-200 bg-white hover:border-slate-300"}`}>
              <span className="text-xs font-bold text-indigo-600">{item.title}</span>
              <h2 className="mt-3 text-3xl font-black text-slate-950">₹{(offerActive ? item.amount : item.regularAmount).toLocaleString("en-IN")}</h2>
              <p className="mt-2 text-xs text-slate-500">{offerActive ? item.detail : item.regularAmount > item.amount ? `Regular total · ₹${item.regularAmount.toLocaleString("en-IN")}` : item.detail}</p>
            </button>
          ))}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 text-slate-700">
            {complete ? <CheckCircle2 className="text-emerald-600" /> : <ShieldCheck className="text-indigo-600" />}
            <div><p className="font-black">Secure Razorpay checkout</p><p className="text-xs text-slate-500">₹{selectedAmount.toLocaleString("en-IN")} INR · verified before enrollment activation</p></div>
          </div>
          {message && <p role="status" className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{message}</p>}
          <button type="button" disabled={busy || !authReady || !signedIn || complete} onClick={startPayment} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-4 text-sm font-black text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
            {!authReady ? "Checking account…" : busy ? "Processing…" : complete ? "Enrollment active" : `Pay ₹${selectedAmount.toLocaleString("en-IN")}`} <ArrowRight size={16} />
          </button>
          {authReady && !signedIn && <p className="mt-3 text-center text-xs text-slate-500">Please <Link className="font-bold text-indigo-600" href={`/student-auth?redirect=${encodeURIComponent(`/billing?bookingId=${bookingId}&plan=${plan}`)}`}>sign in</Link> with the student account that owns this trial.</p>}
          {!bookingId && <p className="mt-3 text-center text-xs text-amber-700">Choose “Continue with this class” from your trial card in the student hub.</p>}
        </div>
      </main>
    </>
  );
}
