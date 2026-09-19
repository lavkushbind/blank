"use client";

import React, { useState, useEffect } from "react";
import { useRoomContext } from "@livekit/components-react";
import { BarChart2, CheckCircle2, Clock } from "lucide-react";

export function LivePollModal({ isTeacher = false }: { isTeacher?: boolean }) {
  const room = useRoomContext();
  const [activePoll, setActivePoll] = useState<{
    question: string;
    options: string[];
    votes: number[];
  } | null>(null);
  const [hasVoted, setHasVoted] = useState<number | null>(null);
  const [showCreator, setShowCreator] = useState(false);

  // Poll creation inputs
  const [customQ, setCustomQ] = useState("Solve: 2x + 7 = 19. What is x?");
  const [opts, setOpts] = useState(["x = 4", "x = 6", "x = 5", "x = 12"]);

  useEffect(() => {
    if (!room) return;
    const handleData = (payload: Uint8Array) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.event === "POLL_LAUNCH") {
          setActivePoll({ question: data.question, options: data.options, votes: [0, 0, 0, 0] });
          setHasVoted(null);
        } else if (data.event === "POLL_VOTE") {
          setActivePoll((prev) => {
            if (!prev) return prev;
            const updated = [...prev.votes];
            updated[data.optionIdx] = (updated[data.optionIdx] || 0) + 1;
            return { ...prev, votes: updated };
          });
        } else if (data.event === "POLL_CLOSE") {
          setActivePoll(null);
        }
      } catch (err) {
        console.error("Poll decode error", err);
      }
    };
    room.on("dataReceived", handleData);
    return () => { room.off("dataReceived", handleData); };
  }, [room]);

  const launchPoll = () => {
    if (!room || !isTeacher) return;
    const packet = { event: "POLL_LAUNCH", question: customQ, options: opts };
    const encoder = new TextEncoder();
    room.localParticipant.publishData(encoder.encode(JSON.stringify(packet)) as any, { reliable: true });
    setActivePoll({ question: customQ, options: opts, votes: [0, 0, 0, 0] });
    setShowCreator(false);
  };

  const castVote = (idx: number) => {
    if (!room || hasVoted !== null) return;
    setHasVoted(idx);
    const packet = { event: "POLL_VOTE", optionIdx: idx };
    const encoder = new TextEncoder();
    room.localParticipant.publishData(encoder.encode(JSON.stringify(packet)) as any, { reliable: true });
  };

  const closePoll = () => {
    if (!room || !isTeacher) return;
    setActivePoll(null);
    const packet = { event: "POLL_CLOSE" };
    const encoder = new TextEncoder();
    room.localParticipant.publishData(encoder.encode(JSON.stringify(packet)) as any, { reliable: true });
  };

  const totalVotes = activePoll ? activePoll.votes.reduce((a, b) => a + b, 0) : 0;

  return (
    <>
      {/* Teacher Launch Button */}
      {isTeacher && !activePoll && (
        <button
          onClick={() => setShowCreator(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
        >
          <BarChart2 size={14} /> Trigger Live Poll
        </button>
      )}

      {/* Teacher Poll Creator Modal */}
      {showCreator && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-black text-slate-900">Launch 1:5 In-Class Live Poll</h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Question</label>
              <input
                type="text"
                value={customQ}
                onChange={(e) => setCustomQ(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">4 Options</label>
              {opts.map((opt, i) => (
                <input
                  key={i}
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...opts];
                    newOpts[i] = e.target.value;
                    setOpts(newOpts);
                  }}
                  className="w-full text-xs font-semibold p-2 rounded-lg border border-slate-200"
                />
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCreator(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={launchPoll}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow"
              >
                Broadcast to Pod →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Poll Overlay Card */}
      {activePoll && (
        <div className="fixed bottom-20 right-6 z-50 bg-white border-2 border-indigo-600 p-5 rounded-3xl shadow-2xl w-84 max-w-xs space-y-4 animate-in fade-in">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <span className="text-[10px] font-mono font-black uppercase tracking-wider text-indigo-600 flex items-center gap-1">
              <Clock size={12} /> Live Pod Poll ({totalVotes}/5 voted)
            </span>
            {isTeacher && (
              <button onClick={closePoll} className="text-slate-400 hover:text-slate-800 text-xs font-bold">
                ✕ Close
              </button>
            )}
          </div>

          <p className="text-xs font-black text-slate-900 leading-snug">{activePoll.question}</p>

          {/* Options with Live Vote Percentage Bars */}
          <div className="space-y-2">
            {activePoll.options.map((option, idx) => {
              const voteCount = activePoll.votes[idx] || 0;
              const percent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
              return (
                <button
                  key={idx}
                  disabled={hasVoted !== null && !isTeacher}
                  onClick={() => castVote(idx)}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs font-semibold relative overflow-hidden transition ${
                    hasVoted === idx
                      ? "border-indigo-600 bg-indigo-50 text-indigo-950 font-bold"
                      : "border-slate-200 hover:border-slate-300 text-slate-800"
                  }`}
                >
                  {/* Visual Vote Progress Fill */}
                  <div
                    className="absolute inset-0 bg-indigo-100/50 -z-10 transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                  <div className="flex justify-between items-center relative z-10">
                    <span>{option}</span>
                    <span className="font-mono text-[10px] text-slate-500 font-bold">{percent}%</span>
                  </div>
                </button>
              );
            })}
          </div>

          {!isTeacher && hasVoted !== null && (
            <p className="text-[10px] text-emerald-700 font-bold text-center">✓ Answer submitted to mentor!</p>
          )}
        </div>
      )}
    </>
  );
}