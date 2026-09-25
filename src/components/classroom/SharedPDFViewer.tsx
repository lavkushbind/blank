"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useParticipants, useRoomContext } from "@livekit/components-react";
import { ChevronLeft, ChevronRight, Eraser, FileText, Highlighter, Loader2, PenLine, Upload } from "lucide-react";
import { auth } from "@/lib/firebase/client";

type SharedDocument = { url: string; name: string; pages: number; page: number };
type AnnotationTool = "pen" | "highlighter" | "eraser";
type Point = { x: number; y: number };

async function readApiResponse(response: Response) {
  const raw = await response.text();
  if (!(response.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    throw new Error(response.status === 404 ? "Class materials service was not found. Reload the classroom and try again." : "Class materials service returned an unexpected response.");
  }
  try { return raw ? JSON.parse(raw) : {}; }
  catch { throw new Error("Class materials service returned invalid data."); }
}

export function SharedPDFViewer({ sessionId, isTeacher, compact = false, onActivity }: { sessionId: string; isTeacher: boolean; compact?: boolean; onActivity?: (note: string) => void }) {
  const room = useRoomContext();
  const participants = useParticipants();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<Point>({ x: 0, y: 0 });
  const [document, setDocument] = useState<SharedDocument | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [annotating, setAnnotating] = useState(false);
  const [annotationTool, setAnnotationTool] = useState<AnnotationTool>("pen");
  const [annotationColor, setAnnotationColor] = useState("#e11d48");

  function renderAnnotation(ctx: CanvasRenderingContext2D, packet: any) {
    if (packet.page !== document?.page) return;
    if (packet.tool === "eraser") ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.moveTo(packet.from.x, packet.from.y);
    ctx.lineTo(packet.to.x, packet.to.y);
    ctx.strokeStyle = packet.color;
    ctx.lineWidth = packet.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }

  useEffect(() => {
    const onData = (payload: Uint8Array) => {
      try {
        const packet = JSON.parse(new TextDecoder().decode(payload));
        if (packet.event === "CLASS_PDF") {
          setDocument((current) => current?.url === packet.document.url ? current : { ...packet.document, page: 1 });
        }
        if (packet.event === "CLASS_PDF_PAGE") {
          setDocument((current) => current && current.page !== packet.page ? { ...current, page: packet.page } : current);
        }
        if (packet.event === "CLASS_PDF_ANNOTATION" && packet.page === document?.page) {
          const context = canvasRef.current?.getContext("2d");
          if (context) renderAnnotation(context, packet);
        }
      } catch {
        // Ignore unrelated or non-JSON room packets.
      }
    };
    room.on("dataReceived", onData);
    return () => { room.off("dataReceived", onData); };
  }, [document?.page, room]);

  useEffect(() => {
    if (!isTeacher || !document || participants.length < 2) return;
    room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ event: "CLASS_PDF", document })) as any, { reliable: true } as any);
  }, [document, isTeacher, participants.length, room]);

  useEffect(() => {
    canvasRef.current?.getContext("2d")?.clearRect(0, 0, 1400, 1000);
  }, [document?.url, document?.page]);

  async function uploadPDF(file?: File) {
    if (!file) return;
    if (file.type !== "application/pdf" || file.size > 25 * 1024 * 1024) {
      setError("Choose a PDF smaller than 25 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Sign in again to upload class material.");
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`/api/class_sessions/${encodeURIComponent(sessionId)}/materials`, {
        method: "POST",
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        body: form,
      });
      const result = await readApiResponse(response);
      if (!response.ok || !result.success || !result.document?.url) throw new Error(result.error || "Upload failed.");
      const next: SharedDocument = { url: result.document.url, name: result.document.name || file.name, pages: 1, page: 1 };
      setDocument(next);
      onActivity?.(`Shared lesson PDF “${next.name}”.`);
      room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ event: "CLASS_PDF", document: next })) as any, { reliable: true } as any);
    } catch (cause) {
      console.error("PDF upload failed", cause);
      setError(cause instanceof Error ? cause.message : "PDF upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function changePage(page: number) {
    if (!document || page < 1 || (document.pages > 1 && page > document.pages)) return;
    const next = { ...document, page };
    canvasRef.current?.getContext("2d")?.clearRect(0, 0, 1400, 1000);
    setDocument(next);
    if (isTeacher) onActivity?.(`Displayed PDF page ${page} of “${document.name}”.`);
    if (isTeacher) room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ event: "CLASS_PDF_PAGE", page })) as any, { reliable: true } as any);
  }

  function annotationPoint(event: PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
  }

  function startAnnotation(event: PointerEvent<HTMLCanvasElement>) {
    if (!isTeacher || !annotating) return;
    drawing.current = true;
    lastPoint.current = annotationPoint(event);
    onActivity?.(`Annotated PDF page ${document?.page} of “${document?.name || "lesson material"}”.`);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveAnnotation(event: PointerEvent<HTMLCanvasElement>) {
    if (!isTeacher || !annotating || !drawing.current || !document) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const next = annotationPoint(event);
    const color = annotationTool === "eraser" ? "rgba(0,0,0,0)" : annotationTool === "highlighter" ? `${annotationColor}66` : annotationColor;
    const width = annotationTool === "eraser" ? 30 : annotationTool === "highlighter" ? 20 : 5;
    if (annotationTool === "eraser") ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath(); ctx.moveTo(lastPoint.current.x, lastPoint.current.y); ctx.lineTo(next.x, next.y);
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
    const packet = { event: "CLASS_PDF_ANNOTATION", page: document.page, from: lastPoint.current, to: next, color, size: width, tool: annotationTool };
    room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(packet)) as any, { reliable: true } as any);
    lastPoint.current = next;
  }

  function stopAnnotation() { drawing.current = false; }

  return (
    <section className={`flex h-full ${compact ? "min-h-0" : "min-h-[460px]"} flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 text-slate-900`}>
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-sm font-bold">
          <FileText size={17} className="shrink-0 text-rose-600" />
          <span className="truncate">{document?.name || "Class materials"}</span>
        </div>
        <div className="flex items-center gap-2">
          {isTeacher && document && <><div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1"><button type="button" title="Pen" aria-label="Pen" onClick={() => { setAnnotationTool("pen"); setAnnotating(true); }} className={`rounded-lg p-2 ${annotating && annotationTool === "pen" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-white"}`}><PenLine size={15}/></button><button type="button" title="Highlighter" aria-label="Highlighter" onClick={() => { setAnnotationTool("highlighter"); setAnnotating(true); }} className={`rounded-lg p-2 ${annotating && annotationTool === "highlighter" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-white"}`}><Highlighter size={15}/></button><button type="button" title="Eraser" aria-label="Eraser" onClick={() => { setAnnotationTool("eraser"); setAnnotating(true); }} className={`rounded-lg p-2 ${annotating && annotationTool === "eraser" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-white"}`}><Eraser size={15}/></button><input aria-label="Annotation color" type="color" value={annotationColor} onChange={(event) => setAnnotationColor(event.target.value)} className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent p-1"/><button type="button" onClick={() => setAnnotating(false)} className={`rounded-lg px-2 py-1.5 text-[10px] font-bold ${!annotating ? "bg-white text-slate-700" : "text-slate-500"}`}>Read</button></div></>}
          {document && <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-2 py-1 text-xs font-bold"><button aria-label="Previous page" onClick={() => changePage(document.page - 1)} disabled={document.page <= 1} className="rounded p-1 hover:bg-white disabled:opacity-30"><ChevronLeft size={16} /></button><span>Page {document.page}{document.pages > 1 ? ` / ${document.pages}` : ""}</span><button aria-label="Next page" onClick={() => changePage(document.page + 1)} disabled={document.pages > 1 && document.page >= document.pages} className="rounded p-1 hover:bg-white disabled:opacity-30"><ChevronRight size={16} /></button></div>}
          {isTeacher && <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700">{busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}{busy ? "Uploading" : "Upload PDF"}<input type="file" accept="application/pdf,.pdf" disabled={busy} className="hidden" onChange={(event) => { void uploadPDF(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} /></label>}
        </div>
      </div>
      {error && <p role="alert" className="bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700">{error}</p>}
      {document ? <div className="relative min-h-0 flex-1 bg-slate-300"><iframe key={`${document.url}#page=${document.page}`} title={document.name} src={`${document.url}#page=${document.page}&toolbar=0&navpanes=0`} className={`absolute inset-0 h-full w-full ${annotating ? "pointer-events-none" : ""}`} /><canvas ref={canvasRef} width={1400} height={1000} onPointerDown={startAnnotation} onPointerMove={moveAnnotation} onPointerUp={stopAnnotation} onPointerCancel={stopAnnotation} className={`absolute inset-0 h-full w-full touch-none ${annotating && isTeacher ? "cursor-crosshair" : "pointer-events-none"}`} />{annotating && <span className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-slate-950/75 px-3 py-1.5 text-[10px] font-bold text-white">Annotation mode · select Read to scroll the PDF</span>}</div> : <div className="flex flex-1 flex-col items-center justify-center px-6 text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-rose-600 shadow-sm"><FileText size={28} /></div><h3 className="mt-4 text-lg font-black">No material shared yet</h3><p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{isTeacher ? "Upload a lesson PDF. It will appear for everyone in this classroom." : "Your teacher’s PDF and worksheets will appear here."}</p></div>}
      <p className="border-t border-slate-200 bg-white px-4 py-2 text-[11px] text-slate-500">PDF documents are shared with participants in this live room.</p>
    </section>
  );
}
