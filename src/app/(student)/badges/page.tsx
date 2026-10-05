"use client";
import { readApiResponse } from "@/lib/api-response";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { Award, Check, Coins, Loader2, Lock } from "lucide-react";
import { auth } from "@/lib/firebase/client";

type Badge = { id: string; title: string; description: string; cost: number; unlocked: boolean };

export default function StudentBadgesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => onAuthStateChanged(auth, (current) => setUser(current)), []);
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/student-badges", { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
        const result = await readApiResponse(response);
        if (!response.ok || !result.success) throw new Error(result.message || "Badges could not be loaded.");
        if (active) { setCoins(result.coins); setBadges(result.badges); }
      } catch (error) { if (active) setMessage(error instanceof Error ? error.message : "Badges could not be loaded."); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [user]);

  async function unlock(badge: Badge) {
    if (!user || busy) return;
    setBusy(badge.id); setMessage("");
    try {
      const response = await fetch("/api/student-badges", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ badgeId: badge.id }) });
      const result = await readApiResponse(response);
      if (!response.ok || !result.success) throw new Error(result.message || "Badge could not be unlocked.");
      setCoins(result.coins);
      setBadges((items) => items.map((item) => item.id === badge.id ? { ...item, unlocked: true } : item));
      setMessage(result.alreadyUnlocked ? "This badge is already in your collection." : `${badge.title} added to your collection.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Badge could not be unlocked."); }
    finally { setBusy(""); }
  }

  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6"><div><p className="text-xs font-black uppercase tracking-[.18em] text-indigo-600">Student rewards</p><h1 className="mt-2 text-2xl font-black text-slate-950">Badge collection</h1><p className="mt-1 text-sm text-slate-600">Use earned quiz coins to add badges to your profile.</p></div><div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 font-bold text-amber-900"><Coins size={18}/> {coins} coins</div></div>
    {message && <p role="status" className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm font-semibold text-blue-800">{message}</p>}
    {loading ? <div className="py-16 text-center text-slate-500"><Loader2 className="mx-auto animate-spin"/><p className="mt-3 text-sm">Loading your badge collection…</p></div> : !user ? <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Sign in with your student account to see your coins and badges.</div> : <div className="mt-6 grid gap-4 sm:grid-cols-2">{badges.map((badge) => <article key={badge.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${badge.unlocked ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"}`}><Award size={24}/></div><div><h2 className="font-black text-slate-900">{badge.title}</h2><p className="mt-1 text-xs text-slate-500">{badge.description}</p><p className="mt-2 text-xs font-bold text-amber-700">{badge.cost} coins</p></div></div>{badge.unlocked ? <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"><Check size={14}/> Owned</span> : <button disabled={!!busy || coins < badge.cost} onClick={() => void unlock(badge)} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">{busy === badge.id ? <Loader2 size={13} className="animate-spin"/> : <Lock size={13}/>} Unlock</button>}</article>)}</div>}
  </main>;
}
