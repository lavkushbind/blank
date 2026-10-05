"use client";
import { readApiResponse } from "@/lib/api-response";
import { useEffect, useState } from "react";
import { defaultSettings, PlatformSettings } from "./defaults";
import { auth } from "@/lib/firebase/client";
export function usePlatformSettings() {
  const [config,setConfig] = useState<PlatformSettings>(defaultSettings);
  useEffect(() => { const abort = new AbortController(); const load = () => fetch("/api/platform-settings",{cache:"no-store",signal:abort.signal}).then((r) => {if(!r.ok) throw new Error(); return readApiResponse(r);}).then(setConfig).catch(() => {}); void load(); const timer=setInterval(load,30000); return () => {abort.abort();clearInterval(timer);}; },[]);
  return config;
}
export async function platformRequest(path:string, init:RequestInit = {}) {
  const user=auth.currentUser;
  if(!user) throw new Error("Please sign in first.");
  const response=await fetch(path,{...init,headers:{...(!(init.body instanceof FormData) ? {"Content-Type":"application/json"} : {}),Authorization:`Bearer ${await user.getIdToken()}`,...init.headers},cache:"no-store"});
  const body=await readApiResponse(response);
  if(!response.ok) throw new Error(body.message || "Request failed");
  return body;
}
