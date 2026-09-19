"use client";

import React, { useState, useEffect } from "react";
import { useRoomContext } from "@livekit/components-react";
import { Send, MessageSquare } from "lucide-react";

interface ChatMessage {
  sender: string;
  text: string;
  time: string;
  isTeacher: boolean;
}

export function InClassChat({ participantName, isTeacher = false }: { participantName: string; isTeacher?: boolean }) {
  const room = useRoomContext();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: "Rahul Sir", text: "Welcome to today's 1:5 Pod. Open Chapter 4 on your screens.", time: "05:01 PM", isTeacher: true },
  ]);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (!room) return;
    const handleData = (payload: Uint8Array) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.event === "CHAT_MESSAGE") {
          setMessages((prev) => [...prev, data.message]);
        }
      } catch (err) {
        console.error("Chat sync error", err);
      }
    };
    room.on("dataReceived", handleData);
    return () => { room.off("dataReceived", handleData); };
  }, [room]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !room) return;

    const newMsg: ChatMessage = {
      sender: participantName,
      text: input.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isTeacher,
    };

    setMessages((prev) => [...prev, newMsg]);

    const packet = { event: "CHAT_MESSAGE", message: newMsg };
    const encoder = new TextEncoder();
    room.localParticipant.publishData(encoder.encode(JSON.stringify(packet)) as any, { reliable: true });

    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-3.5 border-b border-slate-100 flex items-center gap-2 text-xs font-black text-slate-900">
        <MessageSquare size={14} className="text-indigo-600" />
        <span>1:5 Pod Chat Desk</span>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs">
        {messages.map((m, i) => (
          <div key={i} className={`space-y-0.5 ${m.isTeacher ? "bg-indigo-50/70 p-2 rounded-xl border border-indigo-100" : ""}`}>
            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
              <span className={m.isTeacher ? "text-indigo-700 font-black" : "text-slate-800 font-bold"}>
                {m.sender} {m.isTeacher ? "(Mentor)" : ""}
              </span>
              <span>{m.time}</span>
            </div>
            <p className="text-slate-800 leading-relaxed font-medium">{m.text}</p>
          </div>
        ))}
      </div>

      {/* Input Box */}
      <form onSubmit={sendMessage} className="p-2 border-t border-slate-100 flex gap-2">
        <input
          type="text"
          placeholder="Ask mentor a doubt..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-600"
        />
        <button
          type="submit"
          className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
        >
          <Send size={13} />
        </button>
      </form>
    </div>
  );
}