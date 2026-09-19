"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase/client";
import { collection, query, getDocs, doc, updateDoc } from "firebase/firestore";
import { CheckCircle2, XCircle, FileText, Video, UserCheck } from "lucide-react";

export default function AdminKYCApprovalPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadApplications() {
      try {
        setLoading(true);
        const snap = await getDocs(collection(db, "teachers"));
        setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("KYC load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadApplications();
  }, []);

  const updateKYC = async (id: string, status: "VERIFIED" | "REJECTED") => {
    try {
      await updateDoc(doc(db, "teachers", id), { kycStatus: status });
      setTeachers(prev => prev.map(t => t.id === id ? { ...t, kycStatus: status } : t));
    } catch (err) {
      console.error("Update KYC status error:", err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-slate-950">Teacher Accreditation & KYC Desk</h1>
        <p className="text-xs text-slate-500">Live teacher applications stored in Firestore.</p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading applications from Firestore...</div>
      ) : teachers.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 rounded-3xl text-center space-y-2 max-w-md mx-auto">
          <UserCheck size={28} className="text-slate-400 mx-auto" />
          <h3 className="text-sm font-black text-slate-900">No Teacher Applications Yet</h3>
          <p className="text-xs text-slate-500">When teachers apply on /onboarding/teacher, their documents will appear here for audit.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {teachers.map((t) => (
            <div key={t.id} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">{t.name}</h3>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    t.kycStatus === "VERIFIED" ? "bg-emerald-100 text-emerald-800" :
                    t.kycStatus === "REJECTED" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {t.kycStatus || "PENDING"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{t.email} • {t.education}</p>
                {t.demoVideoUrl && (
                  <a href={t.demoVideoUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 font-bold hover:underline block mt-1">
                    Watch Submitted Demo Video ↗
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateKYC(t.id, "REJECTED")}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl"
                >
                  Reject
                </button>
                <button
                  onClick={() => updateKYC(t.id, "VERIFIED")}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                >
                  Approve KYC ✓
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}