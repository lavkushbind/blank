"use client";
import { usePlatformSettings } from "@/lib/platform/client";
export function PlatformOffer(){const config=usePlatformSettings();if(!config.offerEnabled)return null;return <aside className="my-5 overflow-hidden rounded-2xl border border-indigo-100 bg-white p-4">{config.offerImage&&<img src={config.offerImage} alt={config.offerTitle || "Special offer"} className="max-h-64 w-full rounded-xl object-contain"/>}<h2 className="mt-3 text-lg font-bold">{config.offerTitle}</h2><p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{config.offerDescription}</p></aside>;}
