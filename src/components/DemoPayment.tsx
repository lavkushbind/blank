"use client";
import { trackConversion } from "@/lib/marketing/conversions";
import { toPaise } from "@/lib/payments/money";
import Script from "next/script";
import { useState } from "react";
import { platformRequest } from "@/lib/platform/client";
export function DemoPayment({bookingId,amount}:{bookingId:string;amount:number}) {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
  async function pay(){setBusy(true);setMessage("");try{
    if(!window.Razorpay)throw new Error("Payment gateway is loading. Please try again shortly.");
    const order=await platformRequest("/api/razorpay/order",{method:"POST",body:JSON.stringify({bookingId})});
    if(order.free){window.location.reload();return;}
    if(!order.orderId || !order.keyId || !Number.isFinite(order.amount))throw new Error("Payment order could not be prepared.");
    trackConversion("begin_checkout",{id:order.orderId,value:order.amount,product:"demo"});
    const checkout=new window.Razorpay({key:order.keyId,amount:toPaise(order.amount),currency:"INR",order_id:order.orderId,name:"BlankLearn",description:"3-day demo / 3 live sessions",modal:{ondismiss:()=>{setBusy(false);setMessage("Payment not completed. Your booking is saved; you can retry here.");}},handler:async(payment:{razorpay_order_id:string;razorpay_payment_id:string;razorpay_signature:string})=>{try{await platformRequest("/api/razorpay/verify",{method:"POST",body:JSON.stringify({bookingId,razorpayOrderId:payment.razorpay_order_id,razorpayPaymentId:payment.razorpay_payment_id,razorpaySignature:payment.razorpay_signature})});trackConversion("purchase",{id:payment.razorpay_order_id,value:order.amount,product:"demo"});trackConversion("demo_booked",{id:bookingId,value:order.amount,product:"demo"});setMessage("Payment verified. Your three demo sessions are confirmed.");window.location.reload();}catch(e){setMessage((e as Error).message+" If debited, contact support with your booking ID before paying again.");}finally{setBusy(false);}}});checkout.open();
  }catch(e){setMessage((e as Error).message);setBusy(false);}}
  return <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive"/><p className="text-sm font-bold text-slate-900">Payment pending</p><p className="mt-1 text-xs leading-6 text-slate-600">One payment covers all 3 demo days. Classroom access is enabled after payment is verified.</p><button type="button" onClick={()=>void pay()} disabled={busy} className="mt-3 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white disabled:opacity-50">{busy?"Processing...":`Pay ${new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(amount)} for 3 days`}</button>{message&&<p role="status" className="mt-3 text-xs leading-6">{message}</p>}</div>;
}
