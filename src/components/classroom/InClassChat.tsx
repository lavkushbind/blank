"use client";

import React, { useState, useEffect } from "react";
import { useRoomContext } from "@livekit/components-react";
import { Send, MessageSquare, X } from "lucide-react";

interface ChatMessage {
  sender: string;
  text: string;
  time: string;
  isTeacher: boolean;
}

export function InClassChat({ participantName, isTeacher = false, onClose }: { participantName: string; isTeacher?: boolean; onClose?: () => void }) {
  const room = useRoomContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (!room) return;
    const handleData = (payload: Uint8Array) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.event === "CHAT_MESSAGE") {
          setMessages((prev) => [...prev, data.message]);
        }
      } catch {
        // Other LiveKit data packets are not chat messages; ignore them.
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
        <span className="flex-1">Class chat</span>
        <button type="button" aria-label="Close chat" title="Close chat" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"><X size={16}/></button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs">
        {messages.length === 0 && <div className="flex h-full min-h-32 flex-col items-center justify-center text-center"><MessageSquare size={22} className="text-slate-300" /><p className="mt-2 font-bold text-slate-600">Class chat</p><p className="mt-1 max-w-48 leading-5 text-slate-400">Send a question or note to everyone in this room.</p></div>}
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
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-900 caret-indigo-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
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
