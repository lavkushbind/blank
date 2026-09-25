"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { Eraser, PenLine, RectangleHorizontal, RotateCcw, Type } from "lucide-react";

type Tool = "pen" | "highlighter" | "eraser" | "text" | "shape";
type Point = { x: number; y: number };
const COLORS = ["#2563eb", "#e11d48", "#16a34a", "#9333ea", "#f59e0b", "#0f172a"];

export function SuperWhiteboard({ isTeacher = false, compact = false, onActivity }: { isTeacher?: boolean; compact?: boolean; onActivity?: (note: string) => void }) {
  const room = useRoomContext();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastPoint = useRef<Point>({ x: 0, y: 0 });
  const origin = useRef<Point>({ x: 0, y: 0 });
  const drawing = useRef(false);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(4);
  const [text, setText] = useState("");
  const [page, setPage] = useState(1);
  const totalPages = 3;

  function publish(data: Record<string, unknown>) {
    if (!isTeacher) return;
    const packet = { event: "CLASSROOM_BOARD", page, ...data };
    room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(packet)) as any, { reliable: true } as any);
  }

  useEffect(() => {
    const onData = (payload: Uint8Array) => {
      try {
        const packet = JSON.parse(new TextDecoder().decode(payload));
        if (packet.event !== "CLASSROOM_BOARD") return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        if (packet.type === "page") {
          setPage(packet.page);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        } else if (packet.page === page && packet.type === "stroke") {
          ctx.beginPath(); ctx.moveTo(packet.from.x, packet.from.y); ctx.lineTo(packet.to.x, packet.to.y);
          ctx.strokeStyle = packet.color; ctx.lineWidth = packet.size; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
        } else if (packet.page === page && packet.type === "shape") {
          ctx.strokeStyle = packet.color; ctx.lineWidth = packet.size; ctx.strokeRect(packet.x, packet.y, packet.w, packet.h);
        } else if (packet.page === page && packet.type === "text") {
          ctx.fillStyle = packet.color; ctx.font = `${packet.size}px sans-serif`; ctx.fillText(packet.text, packet.x, packet.y);
        } else if (packet.page === page && packet.type === "clear") {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      } catch { /* Ignore unrelated or non-JSON room packets. */ }
    };
    room.on("dataReceived", onData);
    return () => { room.off("dataReceived", onData); };
  }, [page, room]);

  function point(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isTeacher) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const p = point(event);
    if (tool === "text") {
      if (!text.trim()) return;
      ctx.fillStyle = color; ctx.font = `${size * 6}px sans-serif`; ctx.fillText(text.trim(), p.x, p.y);
      publish({ type: "text", x: p.x, y: p.y, text: text.trim(), color, size: size * 6 });
      onActivity?.(`Whiteboard text added: “${text.trim().slice(0, 140)}” (page ${page}).`);
      return;
    }
    drawing.current = true; origin.current = p; lastPoint.current = p;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isTeacher || !drawing.current || tool === "shape") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const next = point(event);
    const stroke = tool === "eraser" ? "#ffffff" : tool === "highlighter" ? `${color}66` : color;
    const width = tool === "eraser" ? size * 5 : tool === "highlighter" ? size * 4 : size;
    ctx.beginPath(); ctx.moveTo(lastPoint.current.x, lastPoint.current.y); ctx.lineTo(next.x, next.y);
    ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
    publish({ type: "stroke", from: lastPoint.current, to: next, color: stroke, size: width });
    lastPoint.current = next;
  }

  function stop(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    if (tool === "shape" && isTeacher) {
      const ctx = canvasRef.current?.getContext("2d");
      const end = point(event);
      if (ctx) { ctx.strokeStyle = color; ctx.lineWidth = size; ctx.strokeRect(origin.current.x, origin.current.y, end.x - origin.current.x, end.y - origin.current.y); }
      publish({ type: "shape", x: origin.current.x, y: origin.current.y, w: end.x - origin.current.x, h: end.y - origin.current.y, color, size });
    }
    drawing.current = false;
    if (isTeacher) onActivity?.(`Whiteboard annotations updated on page ${page}.`);
  }

  function clear() {
    if (!isTeacher) return;
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    publish({ type: "clear" });
    onActivity?.(`Whiteboard page ${page} cleared.`);
  }

  function changePage(next: number) {
    if (!isTeacher || next < 1 || next > totalPages) return;
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setPage(next); publish({ type: "page", page: next });
    onActivity?.(`Moved to whiteboard page ${next}.`);
  }

  const tools: Array<{ id: Tool; label: string; icon: React.ReactNode }> = [
    { id: "pen", label: "Pen", icon: <PenLine size={16} /> },
    { id: "highlighter", label: "Highlight", icon: <span className="text-sm font-black">H</span> },
    { id: "eraser", label: "Eraser", icon: <Eraser size={16} /> },
    { id: "text", label: "Text", icon: <Type size={16} /> },
    { id: "shape", label: "Rectangle", icon: <RectangleHorizontal size={16} /> },
  ];

  return (
    <div className={`flex h-full ${compact ? "min-h-0" : "min-h-[460px]"} flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-xl`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white p-2.5">
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">{tools.map((item) => <button key={item.id} type="button" disabled={!isTeacher} title={item.label} aria-label={item.label} onClick={() => setTool(item.id)} className={`flex h-9 items-center gap-2 rounded-lg px-2.5 text-xs font-bold disabled:opacity-40 ${tool === item.id ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:bg-white"}`}>{item.icon}<span className="hidden sm:inline">{item.label}</span></button>)}</div>
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-2 py-1.5">{COLORS.map((swatch) => <button key={swatch} type="button" disabled={!isTeacher} title={`Choose ${swatch}`} onClick={() => setColor(swatch)} className={`h-6 w-6 rounded-full border-2 disabled:opacity-40 ${color === swatch ? "border-slate-950 ring-2 ring-white" : "border-white"}`} style={{ backgroundColor: swatch }} />)}</div>
        <label className="flex items-center gap-2 rounded-xl bg-slate-100 px-2.5 py-2 text-[11px] font-bold text-slate-600">Size <input aria-label="Brush size" type="range" min="2" max="12" value={size} onChange={(event) => setSize(Number(event.target.value))} disabled={!isTeacher} className="w-20 accent-indigo-600" /></label>
        {tool === "text" && <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Type, then click board" disabled={!isTeacher} className="min-w-36 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-400" />}
        <div className="ml-auto flex items-center gap-2 rounded-xl border border-slate-200 px-2 py-1 text-xs font-bold"><button type="button" disabled={!isTeacher || page <= 1} onClick={() => changePage(page - 1)} className="rounded p-1 hover:bg-slate-100 disabled:opacity-30" aria-label="Previous board page">‹</button><span>Board {page}/{totalPages}</span><button type="button" disabled={!isTeacher || page >= totalPages} onClick={() => changePage(page + 1)} className="rounded p-1 hover:bg-slate-100 disabled:opacity-30" aria-label="Next board page">›</button></div>
        <button type="button" disabled={!isTeacher} onClick={clear} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-40"><RotateCcw size={14} /> Clear</button>
      </div>
      <div className="relative min-h-0 flex-1 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px]">
        <canvas ref={canvasRef} width={1400} height={800} onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} className={`absolute inset-0 h-full w-full touch-none ${isTeacher ? tool === "text" ? "cursor-text" : "cursor-crosshair" : "cursor-default"}`} />
        {!isTeacher && <div className="absolute right-3 top-3 rounded-lg bg-indigo-600/90 px-2.5 py-1.5 text-[10px] font-bold text-white">Following teacher’s board</div>}
      </div>
    </div>
  );
}
