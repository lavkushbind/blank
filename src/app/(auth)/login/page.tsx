"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/lib/firebase/client";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { ArrowRight, Loader2, Code2 } from "lucide-react";

export default function PremiumAuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showDevTools, setShowDevTools] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      if (!isLogin) {
        if (!name.trim()) throw new Error("Full name is required.");
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        updateProfile(cred.user, { displayName: name.trim() }).catch(() => {});
        setDoc(doc(db, "users", cred.user.uid), {
          uid: cred.user.uid, name: name.trim(), email: cred.user.email, role, createdAt: serverTimestamp(),
        }).catch(() => {});
        
        const token = await cred.user.getIdToken();
        document.cookie = `__session=${token}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `user_role=${role}; path=/; max-age=86400; SameSite=Lax`;
        router.push(role === "TEACHER" ? "/dashboard" : "/hub");
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        let currentRole = role;
        try {
          const snap = await getDoc(doc(db, "users", cred.user.uid));
          if (snap.exists()) currentRole = snap.data().role;
        } catch (err) {}

        const token = await cred.user.getIdToken();
        document.cookie = `__session=${token}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `user_role=${currentRole}; path=/; max-age=86400; SameSite=Lax`;
        router.push(currentRole === "TEACHER" ? "/dashboard" : "/hub");
      }
    } catch (err: any) {
      setErrorMsg(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  const handleDevBypass = (selectedRole: "STUDENT" | "TEACHER" | "PARENT" | "ADMIN") => {
    document.cookie = `__session=dev_${Date.now()}; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `user_role=${selectedRole}; path=/; max-age=86400; SameSite=Lax`;
    router.push(selectedRole === "TEACHER" ? "/dashboard" : selectedRole === "STUDENT" ? "/hub" : selectedRole === "PARENT" ? "/report/batch-demo-101" : "/kyc-approval");
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[#fafafa]">
      <Link href="/" className="mb-8 font-black text-2xl tracking-tighter text-zinc-900">
        BlankLearn.
      </Link>

      <div className="w-full max-w-[400px] saas-card p-8 space-y-6">
        <div className="space-y-1.5 text-center">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            {isLogin ? "Sign in to your account" : "Create an account"}
          </h1>
          <p className="text-sm text-zinc-500">
            {isLogin ? "Enter your email below to log in" : "Enter your details below to sign up"}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-3 mb-2 border-b border-zinc-100 pb-4">
              <button type="button" onClick={() => setRole("STUDENT")} className={`py-2 text-xs font-semibold rounded-md border transition ${role === "STUDENT" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600 bg-white"}`}>Student</button>
              <button type="button" onClick={() => setRole("TEACHER")} className={`py-2 text-xs font-semibold rounded-md border transition ${role === "TEACHER" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600 bg-white"}`}>Teacher</button>
            </div>
          )}

          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Full Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="saas-input" placeholder="John Doe" />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="saas-input" placeholder="m@example.com" />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-zinc-700">Password</label>
              {isLogin && <a href="#" className="text-xs text-zinc-500 hover:text-zinc-900">Forgot password?</a>}
            </div>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="saas-input" />
          </div>

          <button type="submit" disabled={loading} className="w-full saas-button mt-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isLogin ? "Sign In" : "Sign Up")}
          </button>
        </form>

        <div className="text-center text-sm text-zinc-500 pt-2 border-t border-zinc-100">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setIsLogin(!isLogin); setErrorMsg(""); }} className="font-semibold text-zinc-900 hover:underline">
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </div>
      </div>

      <div className="mt-8 text-center">
        <button onClick={() => setShowDevTools(!showDevTools)} className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1 mx-auto">
          <Code2 size={14} /> Developer Bypass
        </button>
        {showDevTools && (
          <div className="flex gap-2 mt-4">
            {["STUDENT", "TEACHER", "PARENT", "ADMIN"].map((r) => (
              <button key={r} onClick={() => handleDevBypass(r as any)} className="text-[10px] uppercase font-bold text-zinc-500 bg-white border border-zinc-200 px-3 py-1.5 rounded-md hover:border-zinc-400 transition">
                {r}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}