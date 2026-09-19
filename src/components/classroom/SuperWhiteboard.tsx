"use client";

import React, { useRef, useState, useEffect } from "react";
import { useRoomContext } from "@livekit/components-react";
import { 
  Edit2, 
  Eraser, 
  MousePointer, 
  Type, 
  Square, 
  FileUp, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Download
} from "lucide-react";

export function SuperWhiteboard({ isTeacher = false }: { isTeacher?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const room = useRoomContext();

  const [tool, setTool] = useState<"pen" | "eraser" | "select" | "text" | "shape" | "pdf">("pen");
  const [color, setColor] = useState("#0f172a");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 3;

  const sendSync = (data: any) => {
    if (!room || !isTeacher) return;
    const packet = { event: "PRO_BOARD_SYNC", ...data };
    const encoder = new TextEncoder();
    room.localParticipant.publishData(encoder.encode(JSON.stringify(packet)) as any, { reliable: true });
  };

  useEffect(() => {
    if (!room) return;
    const handleData = (payload: Uint8Array) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.event === "PRO_BOARD_SYNC") {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          if (data.type === "draw") {
            ctx.strokeStyle = data.color;
            ctx.lineWidth = data.width;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(data.fromX, data.fromY);
            ctx.lineTo(data.toX, data.toY);
            ctx.stroke();
          } else if (data.type === "clear") {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          } else if (data.type === "page") {
            setCurrentPage(data.page);
          }
        }
      } catch (err) {
        console.error("Board sync error", err);
      }
    };
    room.on("dataReceived", handleData);
    return () => { room.off("dataReceived", handleData); };
  }, [room]);

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isTeacher || tool === "select") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setStartPos({ x, y });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isTeacher || tool === "select") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = tool === "eraser" ? 24 : strokeWidth;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(startPos.x, startPos.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    sendSync({
      type: "draw",
      fromX: startPos.x,
      fromY: startPos.y,
      toX: x,
      toY: y,
      color: ctx.strokeStyle,
      width: ctx.lineWidth,
    });

    setStartPos({ x, y });
  };

  const stopDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    if (!isTeacher) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    sendSync({ type: "clear" });
  };

  return (
    <div className="flex-1 flex bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative">
      
      {/* 1. LEFT VERTICAL TOOLBAR */}
      <div className="w-16 bg-slate-50 border-r border-slate-200 p-2.5 flex flex-col items-center gap-3 shrink-0 z-20">
        {[
          { id: "pen", icon: Edit2, label: "Pen" },
          { id: "eraser", icon: Eraser, label: "Eraser" },
          { id: "select", icon: MousePointer, label: "Select" },
          { id: "text", icon: Type, label: "Text" },
          { id: "shape", icon: Square, label: "Shape" },
          { id: "pdf", icon: FileUp, label: "PDF" },
        ].map((item) => {
          const Icon = item.icon;
          const active = tool === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTool(item.id as any)}
              className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition ${
                active ? "bg-blue-600 text-white shadow-md shadow-blue-500/30" : "text-slate-600 hover:bg-slate-200/60"
              }`}
              title={item.label}
            >
              <Icon size={18} />
            </button>
          );
        })}

        <div className="w-8 h-px bg-slate-200 my-1" />

        {/* Color Palette */}
        <div className="flex flex-col gap-2">
          {["#0f172a", "#2563eb", "#dc2626", "#059669"].map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border transition ${color === c ? "scale-110 ring-2 ring-blue-600" : "border-transparent"}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="mt-auto">
          <button
            onClick={clearCanvas}
            className="w-10 h-10 rounded-xl text-red-600 hover:bg-red-50 flex items-center justify-center"
            title="Clear board"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* 2. MAIN CANVAS AREA */}
      <div className="flex-1 relative bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] overflow-hidden flex flex-col">
        
        {/* Top Page Switcher Bar */}
        <div className="absolute top-3 right-4 z-20 bg-white/90 backdrop-blur-md border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-3 text-xs font-bold text-slate-700">
          <button
            disabled={currentPage <= 1 || !isTeacher}
            onClick={() => { setCurrentPage(p => p - 1); sendSync({ type: "page", page: currentPage - 1 }); }}
            className="p-1 rounded hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="font-mono">Page {currentPage} of {totalPages}</span>
          <button
            disabled={currentPage >= totalPages || !isTeacher}
            onClick={() => { setCurrentPage(p => p + 1); sendSync({ type: "page", page: currentPage + 1 }); }}
            className="p-1 rounded hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={1400}
          height={800}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          className={`w-full h-full ${isTeacher ? (tool === "select" ? "cursor-default" : "cursor-crosshair") : "cursor-default"}`}
        />
      </div>

    </div>
  );
}