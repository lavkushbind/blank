"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Search, Star, CheckCircle2, ShieldCheck, ArrowRight, UserX, Clock } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export default function FindTeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [selectedGrade, setSelectedGrade] = useState("All");

  useEffect(() => {
    async function fetchRealTeachers() {
      try {
        setLoading(true);
        const q = query(collection(db, "teachers"), where("kycStatus", "==", "VERIFIED"));
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTeachers(list);
      } catch (err) {
        console.error("Firestore teachers fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRealTeachers();
  }, []);

  const filtered = teachers.filter(t => {
    const matchesSearch = !searchQuery || t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.subjects?.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSubject = selectedSubject === "All" || t.subjects?.includes(selectedSubject);
    const matchesGrade = selectedGrade === "All" || t.grades?.includes(selectedGrade);
    return matchesSearch && matchesSubject && matchesGrade;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
              <BrandLogo className="h-full w-full rounded-[inherit] object-cover" />
            </div>
            <span className="font-black text-base text-slate-950">BlankLearn Teachers</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs font-bold text-slate-600 hover:text-slate-900">Home</Link>
            <Link href="/onboarding/teacher" className="text-xs font-bold px-3 py-1.5 bg-indigo-600 text-white rounded-lg">
              Apply to Teach
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950">Accredited 1:5 Mentors</h1>
          <p className="text-xs text-slate-500 mt-1">Live database of verified teachers for CBSE & ICSE classes 6–10.</p>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Search by teacher name or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs font-semibold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
          >
            <option value="All">All Subjects</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Science">Science</option>
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="English">English</option>
          </select>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
          >
            <option value="All">All Grades</option>
            <option value="Class 6">Class 6</option>
            <option value="Class 7">Class 7</option>
            <option value="Class 8">Class 8</option>
            <option value="Class 9">Class 9</option>
            <option value="Class 10">Class 10</option>
          </select>
        </div>

        {/* Teacher Cards Grid / Clean Empty State */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Querying live Firestore teacher database...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 p-12 rounded-3xl text-center space-y-3 shadow-sm max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <UserX size={24} />
            </div>
            <h3 className="text-base font-black text-slate-900">No Verified Teachers in Database Yet</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              When teachers complete accreditation and KYC approval, their live profiles will automatically appear here.
            </p>
            <Link
              href="/onboarding/teacher"
              className="inline-block px-5 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-sm mt-2"
            >
              Submit First Teacher Application →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((t) => (
              <div key={t.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-black text-xl flex items-center justify-center shrink-0">
                    {t.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-base font-black text-slate-900">{t.name}</h3>
                      <CheckCircle2 size={15} className="text-emerald-600" />
                    </div>
                    <p className="text-xs font-bold text-indigo-600">{t.education}</p>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{t.bio}</p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">₹{t.hourlyRate || 650} / session</span>
                  <Link
                    href={`/teachers/${t.id}`}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl"
                  >
                    View Profile & Book Demo →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        BlankLearn Real-Time Teacher Directory • Live Firestore Sync
      </footer>
    </div>
  );
}