"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Upload, ZoomIn, ZoomOut, Edit3, Eraser } from "lucide-react";
import { useRoomContext } from "@livekit/components-react";

export function PDFDocumentViewer({ isTeacher = false }: { isTeacher?: boolean }) {
  const room = useRoomContext();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 8; // Simulated presentation / PDF worksheet
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<"pen" | "highlighter">("pen");
  const [color, setColor] = useState("#ef4444");

  // Sync page change across WebRTC DataChannel
  const broadcastPage = (page: number) => {
    setCurrentPage(page);
    if (!room || !isTeacher) return;
    const packet = { event: "PDF_PAGE_SYNC", page };
    const encoder = new TextEncoder();
    room.localParticipant.publishData(encoder.encode(JSON.stringify(packet)) as any, { reliable: true });
  };

  useEffect(() => {
    if (!room) return;
    const handleData = (payload: Uint8Array) => {
      try {
        const text = new TextDecoder().decode(payload);
        const data = JSON.parse(text);
        if (data.event === "PDF_PAGE_SYNC") {
          setCurrentPage(data.page);
        }
      } catch (err) {
        console.error("PDF sync error", err);
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
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isTeacher) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = tool === "highlighter" ? "rgba(253, 224, 71, 0.4)" : color;
    ctx.lineWidth = tool === "highlighter" ? 14 : 2.5;
    ctx.lineCap = "round";
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDraw = () => setIsDrawing(false);

  const clearAnnotations = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="relative w-full h-full bg-slate-900 flex flex-col rounded-2xl overflow-hidden border border-slate-800">
      {/* Top Toolbar */}
      <div className="h-12 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between text-xs text-white">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-300">Worksheet: NCERT_Algebra_Class7.pdf</span>
          {isTeacher && (
            <label className="bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-1 text-[11px] font-semibold border border-slate-700">
              <Upload size={12} /> Upload New PDF
              <input type="file" accept=".pdf" className="hidden" onChange={() => alert("PDF loaded into teacher presentation stage.")} />
            </label>
          )}
        </div>

        {/* Page Navigators */}
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage <= 1 || !isTeacher}
            onClick={() => broadcastPage(currentPage - 1)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="font-mono font-bold">Page {currentPage} of {totalPages}</span>
          <button
            disabled={currentPage >= totalPages || !isTeacher}
            onClick={() => broadcastPage(currentPage + 1)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Annotations Controls */}
        {isTeacher && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTool("pen")}
              className={`p-1.5 rounded ${tool === "pen" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"}`}
              title="Pen"
            >
              <Edit3 size={14} />
            </button>
            <button
              onClick={() => setTool("highlighter")}
              className={`p-1.5 rounded ${tool === "highlighter" ? "bg-amber-500 text-white" : "bg-slate-800 text-slate-400"}`}
              title="Highlighter"
            >
              🖍️
            </button>
            <button
              onClick={clearAnnotations}
              className="p-1.5 bg-slate-800 hover:bg-red-900/50 hover:text-red-300 text-slate-400 rounded"
              title="Clear drawings on page"
            >
              <Eraser size={14} />
            </button>
          </div>
        )}
      </div>

      {/* PDF Viewport with Overlay Drawing Canvas */}
      <div className="flex-1 relative flex items-center justify-center p-4 bg-slate-950/60 overflow-hidden">
        {/* Rendered PDF Page Background */}
        <div className="w-full max-w-2xl h-[480px] bg-white rounded-xl shadow-2xl p-8 relative overflow-hidden flex flex-col justify-between select-none">
          <div className="space-y-4">
            <div className="flex justify-between border-b pb-2 text-slate-500 text-xs font-serif">
              <span>NCERT Mathematics • Grade 7</span>
              <span>Chapter 4: Simple Equations</span>
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Exercise 4.2 — Question {currentPage}:</h4>
            <p className="text-slate-800 text-xs leading-relaxed font-serif">
              Solve the following equation step by step and verify your answer:
            </p>
            <div className="p-4 bg-slate-50 border rounded-lg text-center font-mono font-bold text-base text-indigo-900">
              {currentPage === 1 && "3n + 7 = 25"}
              {currentPage === 2 && "2x - 5 = 3x + 10"}
              {currentPage === 3 && "5p / 2 = 15"}
              {currentPage > 3 && `(4x + ${currentPage * 2}) / 3 = 18`}
            </div>
            <p className="text-slate-500 text-[11px]">
              Tip: Transpose the constant term to the right-hand side with sign inversion.
            </p>
          </div>

          <div className="text-right text-[10px] text-slate-400 font-mono">
            BlankLearn Certified Curriculum Sheet • Page {currentPage}
          </div>

          {/* Interactive Annotation Canvas on Top of the PDF */}
          <canvas
            ref={canvasRef}
            width={672}
            height={480}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            className={`absolute inset-0 z-20 ${isTeacher ? "cursor-crosshair" : "pointer-events-none"}`}
          />
        </div>
      </div>
    </div>
  );
}