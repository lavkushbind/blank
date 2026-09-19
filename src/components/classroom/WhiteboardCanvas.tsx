"use client";

import React, { useRef, useState, useEffect } from "react";
import { useRoomContext } from "@livekit/components-react";

interface DrawData {
  x: number;
  y: number;
  type: "start" | "draw" | "end" | "clear";
  color: string;
}

export function WhiteboardCanvas({ isTeacher = false }: { isTeacher?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#3b82f6");
  const room = useRoomContext();

  const sendDrawPacket = (packet: DrawData) => {
    if (!room || !isTeacher) return;
    const str = JSON.stringify({ event: "WHITEBOARD_DRAW", ...packet });
    const encoder = new TextEncoder();
    room.localParticipant.publishData(encoder.encode(str) as any, { reliable: true });
  };

  useEffect(() => {
    if (!room) return;
    const handleData = (payload: Uint8Array) => {
      try {
        const text = new TextDecoder().decode(payload);
        const data = JSON.parse(text);
        if (data.event === "WHITEBOARD_DRAW") {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          if (data.type === "start") {
            ctx.beginPath();
            ctx.moveTo(data.x, data.y);
          } else if (data.type === "draw") {
            ctx.strokeStyle = data.color;
            ctx.lineWidth = 2;
            ctx.lineTo(data.x, data.y);
            ctx.stroke();
          } else if (data.type === "clear") {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      } catch (err) {
        console.error("Whiteboard sync decode error", err);
      }
    };

    room.on("dataReceived", handleData);
    return () => {
      room.off("dataReceived", handleData);
    };
  }, [room]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
    sendDrawPacket({ x, y, type: "start", color });
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
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineTo(x, y);
    ctx.stroke();
    sendDrawPacket({ x, y, type: "draw", color });
  };

  const stopDrawing = () => {
    if (!isTeacher) return;
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!isTeacher) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    sendDrawPacket({ x: 0, y: 0, type: "clear", color });
  };

  return (
    <div className="relative w-full h-full bg-white rounded-xl shadow-inner overflow-hidden flex flex-col">
      {isTeacher && (
        <div className="absolute top-3 left-3 z-10 flex gap-2 bg-slate-900/80 backdrop-blur p-1.5 rounded-lg border border-slate-700">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-7 h-7 rounded border-none cursor-pointer"
          />
          <button
            onClick={clearCanvas}
            className="px-2 py-1 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded"
          >
            Clear
          </button>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={900}
        height={550}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="w-full h-full cursor-crosshair touch-none"
      />
    </div>
  );
}