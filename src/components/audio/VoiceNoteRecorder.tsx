"use client";

import React, { useState, useRef } from "react";
import { Mic, Square, Play, RotateCcw } from "lucide-react";

interface Props {
  studentName: string;
  onAudioRecorded: (blob: Blob) => void;
}

export function VoiceNoteRecorder({ studentName, onAudioRecorded }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        onAudioRecorded(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resetRecording = () => {
    setRecordedUrl(null);
    setRecordingTime(0);
  };

  return (
    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
      <p className="text-xs font-semibold text-slate-300 mb-2">
        Audio Remark for <span className="text-indigo-400 font-bold">{studentName}</span> (30-60 sec)
      </p>

      {!recordedUrl ? (
        <div className="flex items-center gap-3">
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
            >
              <Mic size={16} /> Record Voice Note
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold animate-pulse"
            >
              <Square size={16} /> Stop ({recordingTime}s / 60s)
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <audio src={recordedUrl} controls className="h-8 max-w-[240px]" />
          <button
            type="button"
            onClick={resetRecording}
            className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800 text-xs"
            title="Re-record"
          >
            <RotateCcw size={14} />
          </button>
          <span className="text-[11px] font-mono text-emerald-400">✓ Ready to send</span>
        </div>
      )}
    </div>
  );
}