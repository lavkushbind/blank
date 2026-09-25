type TrackerWindow = Window & {gtag?:(...args:unknown[])=>void;fbq?:(...args:unknown[])=>void};
export function trackingAllowed(){try{return localStorage.getItem("blanklearn_tracking_consent")==="accepted";}catch{return false;}}
export function trackConversion(event:"begin_checkout"|"purchase"|"demo_booked", input:{id:string;value:number;product:string}) {
  if(typeof window==="undefined" || !trackingAllowed() || !Number.isFinite(input.value) || input.value<0)return;
  const w=window as TrackerWindow;
  const key=`bl_conversion:${event}:${input.id}`;
  try{if(localStorage.getItem(key))return;}catch{}
  const item={item_id:input.product,item_name:input.product==="demo"?"3-day demo":input.product,price:input.value,quantity:1};
  const data={currency:"INR",value:input.value,items:[item],...(event==="purchase"?{transaction_id:input.id}:{})};
  w.gtag?.("event",event,data);
  w.fbq?.("track",event==="purchase"?"Purchase":event==="begin_checkout"?"InitiateCheckout":"Schedule",{currency:"INR",value:input.value,content_ids:[input.product],content_type:"product",num_items:1},{eventID:`${event}_${input.id}`});
  if(w.gtag || w.fbq)try{localStorage.setItem(key,"1");}catch{}
}
