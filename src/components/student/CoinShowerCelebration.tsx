"use client";

import React, { useEffect } from "react";
import confetti from "canvas-confetti";

export function CoinShowerCelebration({ trigger = false }: { trigger?: boolean }) {
  useEffect(() => {
    if (!trigger) return;
    const end = Date.now() + 1500;
    const colors = ["#f59e0b", "#fbbf24", "#eab308"];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, [trigger]);

  return null;
}