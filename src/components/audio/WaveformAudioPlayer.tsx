"use client";

import React, { useState, useRef } from "react";
import { Play, Pause } from "lucide-react";

interface Props {
  audioUrl: string;
  durationText?: string;
}

export function WaveformAudioPlayer({ audioUrl, durationText = "0:45" }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const cycleSpeed = () => {
    if (!audioRef.current) return;
    const rates = [1, 1.25, 1.5];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    audioRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  return (
    <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-inner">
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => setIsPlaying(false)}
      />
      <button
        onClick={togglePlay}
        className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg transition"
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
      </button>

      {/* Simulated Waveform Visualizer */}
      <div className="flex-1 flex items-center gap-1 h-8">
        {[20, 35, 60, 45, 80, 95, 70, 50, 40, 85, 90, 60, 30, 45, 75, 40, 20].map((height, i) => (
          <div
            key={i}
            className={`w-1.5 rounded-full transition-all duration-200 ${
              isPlaying ? "bg-indigo-400 animate-pulse" : "bg-slate-700"
            }`}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-slate-400">{durationText}</span>
        <button
          onClick={cycleSpeed}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-mono text-xs rounded border border-slate-700"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
}