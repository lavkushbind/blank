"use client";

import React, { useRef, useState, useEffect } from "react";
import { useRoomContext } from "@livekit/components-react";
import { Edit2, Square, Circle, Eraser, RotateCcw, Palette } from "lucide-react";

export function CollaborativeWhiteboard({ isTeacher = false }: { isTeacher?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#4f46e5");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [mode, setMode] = useState<"draw" | "eraser">("draw");
  const room = useRoomContext();

  const sendDrawPacket = (packet: any) => {
    if (!room || !isTeacher) return;
    const payload = JSON.stringify({ event: "WHITEBOARD_SYNC", ...packet });
    const encoder = new TextEncoder();
    room.localParticipant.publishData(encoder.encode(payload) as any, { reliable: true });
  };

  useEffect(() => {
    if (!room) return;
    const handleData = (payload: Uint8Array) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.event === "WHITEBOARD_SYNC") {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          if (data.type === "start") {
            ctx.beginPath();
            ctx.moveTo(data.x, data.y);
          } else if (data.type === "draw") {
            ctx.strokeStyle = data.color;
            ctx.lineWidth = data.width;
            ctx.lineTo(data.x, data.y);
            ctx.stroke();
          } else if (data.type === "clear") {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      } catch (err) {
        console.error("Board sync decode error", err);
      }
    };
    room.on("dataReceived", handleData);
    return () => { room.off("dataReceived", handleData); };
  }, [room]);

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isTeacher) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    sendDrawPacket({ type: "start", x, y });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isTeacher) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.strokeStyle = mode === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = mode === "eraser" ? 20 : strokeWidth;
    ctx.lineCap = "round";
    ctx.lineTo(x, y);
    ctx.stroke();

    sendDrawPacket({
      type: "draw",
      x,
      y,
      color: mode === "eraser" ? "#ffffff" : color,
      width: mode === "eraser" ? 20 : strokeWidth,
    });
  };

  const stopDraw = () => setIsDrawing(false);

  const clearBoard = () => {
    if (!isTeacher) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    sendDrawPacket({ type: "clear" });
  };

  return (
    <div className="relative w-full h-full bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-inner flex flex-col">
      {/* Teacher Whiteboard Toolbar */}
      {isTeacher && (
        <div className="absolute top-4 left-4 z-30 bg-white/95 backdrop-blur-md border border-slate-200 p-2 rounded-2xl shadow-xl flex items-center gap-2.5">
          <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
            <button
              onClick={() => setMode("draw")}
              className={`p-2 rounded-xl transition ${mode === "draw" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
              title="Pen"
            >
              <Edit2 size={15} />
            </button>
            <button
              onClick={() => setMode("eraser")}
              className={`p-2 rounded-xl transition ${mode === "eraser" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
              title="Eraser"
            >
              <Eraser size={15} />
            </button>
          </div>

          {/* Color Palette */}
          <div className="flex items-center gap-1.5 border-r border-slate-200 pr-2">
            {["#4f46e5", "#059669", "#dc2626", "#d97706", "#0f172a"].map((c) => (
              <button
                key={c}
                onClick={() => { setColor(c); setMode("draw"); }}
                className={`w-6 h-6 rounded-full transition border ${color === c && mode === "draw" ? "scale-110 border-slate-950 shadow" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <button
            onClick={clearBoard}
            className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition"
          >
            Clear Board
          </button>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={1200}
        height={700}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        className={`w-full h-full ${isTeacher ? "cursor-crosshair" : "cursor-default"}`}
      />
    </div>
  );
}