"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase/client";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { 
  Users, 
  Video, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Volume2, 
  BookOpen 
} from "lucide-react";

export default function ParentHomePage() {
  const [parentName, setParentName] = useState("Mr. Rajesh Sharma");
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    async function fetchParentData() {
      try {
        setLoading(true);
        const parentUid = user ? user.uid : "parent_current";

        // 1. Fetch Real Parent Profile from Firestore
        const pSnap = await getDoc(doc(db, "parents", parentUid));
        if (pSnap.exists()) {
          setParentName(pSnap.data().name || "Parent");
        }

        // 2. Fetch Linked Students from Firestore
        const qStudents = query(collection(db, "students"), where("parentIds", "array-contains", parentUid));
        const sSnap = await getDocs(qStudents);
        const childList = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Fallback demo child if none linked yet in DB
        if (childList.length === 0) {
          setChildren([
            {
              id: "child_aarav_01",
              name: "Aarav Sharma",
              grade: "Class 7 (CBSE)",
              pod: "Math Titans (1:5 Micro-Batch)",
              mentor: "Rahul Sharma Sir (IIT Delhi)",
              isLiveNow: true,
              joinedAt: "05:01 PM",
              attendance: "96%",
              coins: 450,
              daysLeft: 3,
            }
          ]);
        } else {
          setChildren(childList);
        }
      } catch (err) {
        console.error("Parent home fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchParentData();
  }, [user]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      
      {/* Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
            Parent Command Desk • Firestore Synced
          </span>
          <h1 className="text-2xl font-black text-slate-950 mt-0.5">Welcome, {parentName}</h1>
          <p className="text-xs text-slate-500">Monitoring academic attendance, diagnostic voice notes, and pod renewals.</p>
        </div>

        <Link
          href="/link-child"
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition self-start sm:self-auto"
        >
          + Link Another Child
        </Link>
      </div>

      {/* Children Pod Status Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading children profiles from Firestore...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {children.map((child) => (
            <div
              key={child.id}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5 relative overflow-hidden"
            >
              {child.isLiveNow && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Class is LIVE right now</span>
                  </div>
                  <span className="font-mono text-[11px]">Joined at {child.joinedAt || "05:00 PM"}</span>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-black text-slate-950">{child.name}</h3>
                  <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    🪙 {child.coins || 450} Coins
                  </span>
                </div>
                <p className="text-xs font-bold text-indigo-600">{child.grade || "Class 7 (CBSE)"} • {child.pod || "1:5 Pod"}</p>
                <p className="text-xs text-slate-500">Mentor: {child.mentor || "Verified Mentor"}</p>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Attendance</span>
                  <span className="font-black text-slate-900 text-sm">{child.attendance || "95%"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Renewal Status</span>
                  <span className="font-black text-sm text-emerald-700">
                    Active Pod Seat
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Link
                  href={`/report/batch-demo-101`}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
                >
                  <Volume2 size={15} /> View Diagnostic Proof Report
                </Link>
                <Link
                  href="/billing"
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition text-center block"
                >
                  Manage Subscription & Coins Discount
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}