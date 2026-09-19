"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Send, CheckCheck } from "lucide-react";

export default function TeacherChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [messages, setMessages] = useState([
    { sender: "Parent (Mr. Sharma)", text: "Namaste Sir! Aarav was saying quadratic factorization is a bit confusing.", time: "06:12 PM", isMe: false },
    { sender: "You (Mentor)", text: "Not to worry, I have marked Question 4 in his homework sheet and will review it in our next Friday 5 PM pod.", time: "06:15 PM", isMe: true },
  ]);
  const [input, setInput] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { sender: "You (Mentor)", text: input.trim(), time: "Just now", isMe: true }
    ]);
    setInput("");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 h-[calc(100vh-80px)] flex flex-col space-y-4">
      <div className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/batches" className="text-slate-400 hover:text-slate-900">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h3 className="text-sm font-black text-slate-950">Parent Desk: Mr. Rajesh Sharma</h3>
            <p className="text-[10px] text-slate-500">Student: Aarav Sharma (Class 7, Batch #101)</p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-3xl p-6 overflow-y-auto space-y-4 shadow-sm">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.isMe ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-md p-3.5 rounded-2xl text-xs space-y-1 shadow-sm ${
              m.isMe ? "bg-indigo-600 text-white rounded-br-none" : "bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-none"
            }`}>
              <p className="leading-relaxed">{m.text}</p>
              <div className={`text-[10px] flex items-center justify-end gap-1 ${m.isMe ? "text-indigo-200" : "text-slate-400"}`}>
                <span>{m.time}</span>
                {m.isMe && <CheckCheck size={12} />}
              </div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="bg-white border border-slate-200 p-2.5 rounded-2xl flex items-center gap-2 shadow-sm">
        <input
          type="text"
          placeholder="Reply to parent..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 text-xs p-2.5 rounded-xl border-none focus:outline-none"
        />
        <button type="submit" className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}