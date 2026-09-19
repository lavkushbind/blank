"use client";

import React, { useState, useEffect } from "react";
import { useRoomContext } from "@livekit/components-react";

export function InClassReactions() {
  const room = useRoomContext();
  const [floatingParticles, setFloatingParticles] = useState<Array<{ id: number; emoji: string; x: number }>>([]);

  const emojis = ["👏", "🔥", "❤️", "💡", "🙌", "🎯"];

  useEffect(() => {
    if (!room) return;
    const handleData = (payload: Uint8Array) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.event === "EMOJI_REACTION") {
          spawnEmoji(data.emoji);
        }
      } catch (err) {
        console.error("Reaction sync error", err);
      }
    };
    room.on("dataReceived", handleData);
    return () => { room.off("dataReceived", handleData); };
  }, [room]);

  const spawnEmoji = (emoji: string) => {
    const newParticle = { id: Date.now() + Math.random(), emoji, x: Math.random() * 80 + 10 };
    setFloatingParticles((prev) => [...prev, newParticle]);
    setTimeout(() => {
      setFloatingParticles((prev) => prev.filter((p) => p.id !== newParticle.id));
    }, 2000);
  };

  const triggerReaction = (emoji: string) => {
    spawnEmoji(emoji);
    if (!room) return;
    const packet = { event: "EMOJI_REACTION", emoji };
    const encoder = new TextEncoder();
    room.localParticipant.publishData(encoder.encode(JSON.stringify(packet)) as any, { reliable: true });
  };

  return (
    <>
      {/* Floating Animated Reaction Particles Container */}
      <div className="fixed bottom-24 right-10 pointer-events-none z-50 flex flex-col items-center">
        {floatingParticles.map((p) => (
          <div
            key={p.id}
            className="text-3xl animate-bounce duration-1000 transition-all transform -translate-y-24 opacity-90"
            style={{ left: `${p.x}px` }}
          >
            {p.emoji}
          </div>
        ))}
      </div>

      {/* Emoji Selector Pill */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-2xl shadow-sm">
        {emojis.map((e) => (
          <button
            key={e}
            onClick={() => triggerReaction(e)}
            className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-base transition transform hover:scale-125"
          >
            {e}
          </button>
        ))}
      </div>
    </>
  );
}