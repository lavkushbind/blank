"use client";
import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
const ga=process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";
const pixel=process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
const publicPaths=["/","/demo-booking","/pricing","/teachers","/how-it-works","/for-teachers","/contact","/faq","/billing","/hub"];
export function MarketingAnalytics(){
 const lastPage=useRef("");
 const path=usePathname();const [choice,setChoice]=useState<string|null>("loading");
 useEffect(()=>{try{setChoice(localStorage.getItem("blanklearn_tracking_consent"));}catch{setChoice("declined");}},[]);
 useEffect(()=>{
  if(choice!=="accepted" || !publicPaths.includes(path))return;
  const w=window as any;
  if(/^G-[A-Z0-9]+$/.test(ga)&&!w.gtag){w.dataLayer=w.dataLayer||[];w.gtag=function(){w.dataLayer.push(arguments);};w.gtag("js",new Date());w.gtag("config",ga,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});const script=document.createElement("script");script.async=true;script.src=`https://www.googletagmanager.com/gtag/js?id=${ga}`;document.head.appendChild(script);}
  if(/^\d+$/.test(pixel)&&!w.fbq){const q:any=function(...args:unknown[]){q.callMethod?q.callMethod(...args):q.queue.push(args);};q.queue=[];q.push=q;q.loaded=true;q.version="2.0";w.fbq=q;w._fbq=q;q("set","autoConfig",false,pixel);q("init",pixel);const script=document.createElement("script");script.async=true;script.src="https://connect.facebook.net/en_US/fbevents.js";document.head.appendChild(script);}
  w.fbq?.("consent","grant");
  w.gtag?.("consent","update",{analytics_storage:"granted",ad_storage:"granted",ad_user_data:"denied",ad_personalization:"denied"});
  if(lastPage.current===path)return;
  lastPage.current=path;
  w.gtag?.("event","page_view",{page_location:window.location.origin+path,page_title:path==="/"?"BlankLearn":path.slice(1),page_referrer:""});
  w.fbq?.("track","PageView");
 },[choice,path]);
 function decide(value:string){lastPage.current="";try{localStorage.setItem("blanklearn_tracking_consent",value);}catch{}setChoice(value);if(value==="declined"&&(window as any).fbq)(window as any).fbq("consent","revoke");if(value==="declined"&&(window as any).gtag)(window as any).gtag("consent","update",{analytics_storage:"denied",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"});}
 if((!ga&&!pixel)||!publicPaths.includes(path)||choice==="loading")return null;
 if(choice)return <button type="button" onClick={()=>setChoice(null)} className="fixed bottom-2 left-2 z-40 rounded-lg border bg-white/95 px-2 py-1 text-[10px] text-slate-500">Cookie preferences</button>;
 return <section aria-label="Analytics preferences" className="fixed bottom-5 left-4 right-4 z-[90] max-w-lg rounded-2xl border bg-white p-5 shadow-xl"><h2 className="text-sm font-bold">Analytics & advertising preferences</h2><p className="mt-2 text-xs leading-6 text-slate-600">With your permission, Google Analytics and Meta help us measure visits, demo bookings and purchases. Booking and payment work without tracking.</p><div className="mt-3 flex gap-3"><button onClick={()=>decide("accepted")} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">Accept</button><button onClick={()=>decide("declined")} className="rounded-xl border px-4 py-2 text-xs font-bold">Decline</button></div></section>;
}
