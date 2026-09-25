"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
} from "@livekit/components-react";
import {
  ConnectionState,
  Participant,
  RoomEvent,
  Track,
} from "livekit-client";
import { FileText, MessageSquare, MonitorUp, PenLine, Users, Video } from "lucide-react";
import { SuperWhiteboard } from "@/components/classroom/SuperWhiteboard";
import { SharedPDFViewer } from "@/components/classroom/SharedPDFViewer";
import { InClassChat } from "@/components/classroom/InClassChat";
import { LivePollModal } from "@/components/classroom/LivePollModal";
import { RaiseHandQueue } from "@/components/classroom/RaiseHandQueue";
import { InClassReactions } from "@/components/classroom/InClassReactions";
import { BrandLogo } from "@/components/BrandLogo";
import { auth } from "@/lib/firebase/client";

type ClassroomRole = "TEACHER" | "STUDENT";

export interface LiveKitClassroomProps {
  token: string;
  serverUrl: string;
  role: ClassroomRole;
  sessionId: string;
  className?: string;
  subject?: string;
  lessonTitle?: string;
  teacherName?: string;
  onLeave?: () => void;
  onEndClass?: () => void;
}

function initials(name: string) {
  const value = name.trim();
  if (!value) return "U";
  const parts = value.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function participantName(participant: Participant) {
  return participant.name || participant.identity || "Participant";
}

export default function LiveKitClassroom({
  token,
  serverUrl,
  role,
  sessionId,
  className,
  subject,
  lessonTitle,
  teacherName,
  onLeave,
  onEndClass,
}: LiveKitClassroomProps) {
  const [connected, setConnected] = useState(false);

  if (!token || !serverUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 font-black">
            <BrandLogo className="h-full w-full rounded-[inherit] object-cover" />
          </div>
          <h1 className="mt-5 text-xl font-black">Classroom unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Live classroom credentials are missing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-[#080b12]">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        audio
        video
        onConnected={() => setConnected(true)}
        onDisconnected={() => setConnected(false)}
        data-lk-theme="default"
        className="h-full"
      >
        <RoomAudioRenderer />

        <ClassroomInterface
          role={role}
          sessionId={sessionId}
          classTitle={className}
          subject={subject}
          lessonTitle={lessonTitle}
          teacherName={teacherName}
          connected={connected}
          onLeave={onLeave}
          onEndClass={onEndClass}
        />
      </LiveKitRoom>
    </div>
  );
}

function ClassroomInterface({
  role,
  sessionId,
  classTitle,
  subject,
  lessonTitle,
  teacherName,
  connected,
  onLeave,
  onEndClass,
}: {
  role: ClassroomRole;
  sessionId: string;
  classTitle?: string;
  subject?: string;
  lessonTitle?: string;
  teacherName?: string;
  connected: boolean;
  onLeave?: () => void;
  onEndClass?: () => void;
}) {
  const room = useRoomContext();
  const {
    localParticipant,
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
  } = useLocalParticipant();
  const participants = useParticipants();
  const connectionState = useConnectionState();

  const [showRoster, setShowRoster] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [workspace, setWorkspace] = useState<"board" | "pdf" | "video" | "screen" | "both">("board");
  const [screenShareError, setScreenShareError] = useState("");
  const [screenShareRevision, setScreenShareRevision] = useState(0);
  const activityNotes = useRef<string[]>([]);

  const recordActivity = useCallback((note: string) => {
    const cleanNote = note.trim();
    if (cleanNote && !activityNotes.current.includes(cleanNote)) {
      activityNotes.current.push(cleanNote);
    }
  }, []);

  const remoteParticipants = useMemo(
    () =>
      participants.filter(
        (participant) =>
          participant.identity !== localParticipant.identity,
      ),
    [participants, localParticipant.identity],
  );

  const hasScreenShare = participants.some((participant) =>
    Boolean(participant.getTrackPublication(Track.Source.ScreenShare)?.track),
  );

  useEffect(() => {
    const refreshScreenShare = () => setScreenShareRevision((revision) => revision + 1);
    room.on(RoomEvent.TrackSubscribed, refreshScreenShare);
    room.on(RoomEvent.TrackUnsubscribed, refreshScreenShare);
    room.on(RoomEvent.LocalTrackPublished, refreshScreenShare);
    room.on(RoomEvent.LocalTrackUnpublished, refreshScreenShare);
    return () => {
      room.off(RoomEvent.TrackSubscribed, refreshScreenShare);
      room.off(RoomEvent.TrackUnsubscribed, refreshScreenShare);
      room.off(RoomEvent.LocalTrackPublished, refreshScreenShare);
      room.off(RoomEvent.LocalTrackUnpublished, refreshScreenShare);
    };
  }, [room]);

  useEffect(() => {
    if (isScreenShareEnabled || hasScreenShare) setWorkspace("screen");
  }, [hasScreenShare, isScreenShareEnabled, screenShareRevision]);

  async function toggleMicrophone() {
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (error) {
      console.error("Microphone toggle failed:", error);
    }
  }

  async function toggleCamera() {
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch (error) {
      console.error("Camera toggle failed:", error);
    }
  }

  async function toggleScreenShare() {
    setScreenShareError("");
    try {
      const enabled = !isScreenShareEnabled;
      await localParticipant.setScreenShareEnabled(enabled);
      if (enabled) setWorkspace("screen");
    } catch (error) {
      const issue = error as { name?: string; message?: string };
      const details = `${issue.name || ""} ${issue.message || ""}`.toLowerCase();
      const cancelledByUser =
        issue.name === "AbortError" ||
        /permission denied by user|user (cancelled|canceled)|cancelled by user|canceled by user/.test(details);

      // Dismissing the browser's screen picker is an expected user action.
      if (cancelledByUser) return;

      setScreenShareError(
        /notallowederror|permission|not allowed/.test(details)
          ? "Screen sharing permission was blocked. Allow it in your browser and try again."
          : "Could not start screen sharing. Please try again.",
      );
    }
  }

  async function leaveClass() {
    try {
      await room.disconnect();
    } finally {
      onLeave?.();
    }
  }

  async function endClass() {
    if (role !== "TEACHER") return;

    const confirmed = window.confirm(
      "End this class for everyone?",
    );

    if (!confirmed) return;

    try {
      const user = auth.currentUser;
      if (user) {
        const generatedNotes = [
          `Class: ${lessonTitle || classTitle || "Live class"}${subject ? ` · ${subject}` : ""}`,
          `Recorded classroom activity (${activityNotes.current.length} items):`,
          ...(activityNotes.current.length ? activityNotes.current : ["No whiteboard or PDF actions were recorded during this class."]),
        ].join("\n").slice(0, 1800);
        const response = await fetch(`/api/class_sessions/${encodeURIComponent(sessionId)}/activity-notes`, {
          method: "POST",
          headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
          body: JSON.stringify({ generatedNotes }),
        });
        if (!response.ok) console.error("Class notes could not be saved before ending.");
      }
    } catch (error) {
      console.error("Class notes could not be saved before ending:", error);
    }

    try {
      await room.disconnect();
    } finally {
      onEndClass?.();
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#080b12] text-white">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#0d111b]/95 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-950">
            <BrandLogo className="h-full w-full rounded-[inherit] object-cover" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-black sm:text-base">
                {lessonTitle || "Live Classroom"}
              </h1>
              <span
                className={`hidden rounded-full px-2 py-1 text-[10px] font-black sm:inline-flex ${
                  connected
                    ? "bg-emerald-400/10 text-emerald-300"
                    : "bg-amber-400/10 text-amber-300"
                }`}
              >
                {connected ? "CONNECTED" : "CONNECTING"}
              </span>
            </div>

            <div className="mt-0.5 flex items-center gap-2 truncate text-xs text-white/45">
              {classTitle && <span>{classTitle}</span>}
              {classTitle && subject && <span>/</span>}
              {subject && <span>{subject}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-xl px-3 py-2 text-[10px] font-black ${
              connectionState === ConnectionState.Connected
                ? "bg-emerald-400/10 text-emerald-300"
                : connectionState === ConnectionState.Reconnecting
                  ? "bg-amber-400/10 text-amber-300"
                  : "bg-white/5 text-white/50"
            }`}
          >
            {connectionState === ConnectionState.Connected
              ? "LIVE"
              : connectionState === ConnectionState.Reconnecting
                ? "RECONNECTING"
                : "CONNECTING"}
          </span>

          <span className="hidden rounded-xl bg-white/5 px-3 py-2 text-[10px] font-black text-white/60 sm:inline-flex">
            {role}
          </span>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden p-2 sm:p-3">
        <div className="mx-auto grid h-full min-h-0 max-w-[1800px] grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="flex min-h-0 min-w-0 flex-col gap-2">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-[#0d111b] p-2">
              <div className="flex flex-wrap gap-1">
                <WorkspaceTab active={workspace === "board"} onClick={() => setWorkspace("board")} icon={<PenLine size={15} />}>Whiteboard</WorkspaceTab>
                <WorkspaceTab active={workspace === "pdf"} onClick={() => setWorkspace("pdf")} icon={<FileText size={15} />}>Lesson PDF</WorkspaceTab>
                <WorkspaceTab active={workspace === "screen"} onClick={() => setWorkspace("screen")} icon={<MonitorUp size={15} />}>Screen</WorkspaceTab>
                <WorkspaceTab active={workspace === "both"} onClick={() => setWorkspace("both")} icon={<FileText size={15} />}>PDF + Board</WorkspaceTab>
                <WorkspaceTab active={workspace === "video"} onClick={() => setWorkspace("video")} icon={<Video size={15} />}>People</WorkspaceTab>
              </div>
              <div className="flex items-center gap-2"><RaiseHandQueue participantName={teacherName || participantName(localParticipant)} isTeacher={role === "TEACHER"} /><LivePollModal sessionId={sessionId} isTeacher={role === "TEACHER"} /><InClassReactions /></div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl">
              {workspace === "board" && <SuperWhiteboard isTeacher={role === "TEACHER"} onActivity={recordActivity} />}
              {workspace === "pdf" && <SharedPDFViewer sessionId={sessionId} isTeacher={role === "TEACHER"} onActivity={recordActivity} />}
              {workspace === "both" && <div className="grid h-full min-h-[460px] grid-cols-2 gap-2"><SharedPDFViewer sessionId={sessionId} isTeacher={role === "TEACHER"} compact onActivity={recordActivity} /><SuperWhiteboard isTeacher={role === "TEACHER"} compact onActivity={recordActivity} /></div>}
              {workspace === "screen" && <div className="flex h-full min-h-[460px] items-center justify-center rounded-2xl border border-white/10 bg-black p-3"><div className="w-full"><RemoteScreenShare participants={participants} />{screenShareError && <p role="status" className="mx-auto my-3 max-w-xl rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-center text-xs text-amber-200">{screenShareError}</p>}<p className="py-3 text-center text-xs text-white/55">{isScreenShareEnabled ? "Your screen is being shared with the class." : hasScreenShare ? "A participant is sharing their screen." : "Start screen sharing to present a website, slide deck, or another app."}</p></div></div>}
              {workspace === "video" && <div className="grid h-full min-h-0 grid-cols-2 grid-rows-3 gap-2 rounded-2xl border border-white/10 bg-[#0d111b] p-2 xl:grid-cols-3 xl:grid-rows-2">{[localParticipant, ...remoteParticipants].slice(0, 6).map((participant) => <ParticipantVideo key={participant.identity} participant={participant} compact fill />)}{role === "TEACHER" && Array.from({ length: Math.max(0, 5 - remoteParticipants.length) }).map((_, index) => <OpenSeat key={`seat-${index}`} index={remoteParticipants.length + index + 1} fill />)}</div>}
            </div>
          </section>

          <aside className={`${showRoster ? "flex" : "hidden"} h-full min-h-0 flex-col rounded-3xl border border-white/10 bg-[#0d111b] p-3 lg:flex`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Live classroom</p>
                <h2 className="mt-1 text-sm font-black">People <span className="text-white/45">{Math.min(participants.length, 6)}/6</span></h2>
              </div>
              <button type="button" onClick={() => setShowRoster(false)} className="rounded-lg px-2 py-1 text-xs text-white/45 hover:bg-white/10 lg:hidden">Close</button>
            </div>

            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {[localParticipant, ...remoteParticipants].slice(0, 6).map((participant) => <ParticipantVideo key={participant.identity} participant={participant} compact />)}
              {role === "TEACHER" && Array.from({ length: Math.max(0, 5 - remoteParticipants.length) }).map((_, index) => <OpenSeat key={`open-${index}`} index={remoteParticipants.length + index + 1} />)}
            </div>
          </aside>
        </div>
      </main>

      <div className="relative z-50 shrink-0 border-t border-white/10 bg-[#0b0f18]/95 px-3 py-2 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1000px] items-center justify-center gap-2">
          <Control
            label={isMicrophoneEnabled ? "Mute" : "Unmute"}
            active={isMicrophoneEnabled}
            onClick={toggleMicrophone}
          />

          <button type="button" onClick={() => setShowChat((value) => !value)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-black text-white/80 hover:bg-white/10"><MessageSquare size={15} className="inline mr-1.5" />Chat</button>

          <Control
            label={isCameraEnabled ? "Camera" : "Camera Off"}
            active={isCameraEnabled}
            onClick={toggleCamera}
          />

          <Control
            label={
              isScreenShareEnabled
                ? "Stop Share"
                : "Share Screen"
            }
            active={isScreenShareEnabled}
            onClick={toggleScreenShare}
          />

          <button
            type="button"
            onClick={() => setShowRoster((value) => !value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-black text-white/80 transition hover:bg-white/10 lg:hidden"
          >
            <Users size={15} className="inline mr-1.5" /> People
          </button>

          <button
            type="button"
            onClick={() => setShowDetails((value) => !value)}
            className="hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-black text-white/80 transition hover:bg-white/10 md:inline-flex"
          >
            Details
          </button>

          <button
            type="button"
            onClick={leaveClass}
            className="rounded-xl bg-white/10 px-3 py-2.5 text-xs font-black text-white transition hover:bg-white/15"
          >
            Leave
          </button>

          {role === "TEACHER" && (
            <button
              type="button"
              onClick={endClass}
              className="rounded-xl bg-red-500 px-3 py-2.5 text-xs font-black text-white transition hover:bg-red-400"
            >
              End Class
            </button>
          )}
        </div>

        {(showRoster || showDetails) && (
          <div className="mx-auto mt-3 max-w-[1000px] rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            {showRoster && (
              <div>
                <p className="text-xs font-black text-white">
                  {role === "TEACHER"
                    ? "Connected students"
                    : "Connected participants"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {remoteParticipants.length === 0 ? (
                    <span className="text-xs text-white/40">
                      No one else is connected.
                    </span>
                  ) : (
                    remoteParticipants.map((participant) => (
                      <ParticipantRow
                        key={participant.identity}
                        participant={participant}
                        compact
                      />
                    ))
                  )}
                </div>
              </div>
            )}

            {showDetails && (
              <div className={showRoster ? "mt-4 border-t border-white/10 pt-4" : ""}>
                <p className="text-xs font-black text-white">
                  Session details
                </p>
                <div className="mt-3 grid gap-2 text-xs text-white/50 sm:grid-cols-3">
                  <div>
                    <span className="text-white/30">Session</span>
                    <p className="mt-1 font-bold text-white/80">
                      {sessionId}
                    </p>
                  </div>
                  <div>
                    <span className="text-white/30">Role</span>
                    <p className="mt-1 font-bold text-white/80">
                      {role}
                    </p>
                  </div>
                  <div>
                    <span className="text-white/30">Connection</span>
                    <p className="mt-1 font-bold text-white/80">
                      {connected ? "Connected" : "Connecting"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showChat && <div className="fixed bottom-[4.5rem] right-4 z-[60] h-[min(440px,65vh)] w-[min(360px,calc(100vw-2rem))] shadow-2xl"><InClassChat participantName={teacherName || participantName(localParticipant)} isTeacher={role === "TEACHER"} onClose={() => setShowChat(false)} /></div>}
    </div>
  );
}

function WorkspaceTab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black transition ${active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/30" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>{icon}{children}</button>;
}

function OpenSeat({ index, fill = false }: { index: number; fill?: boolean }) {
  return <div className={`flex ${fill ? "h-full" : "h-20 shrink-0"} items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-3`}><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-xs font-black text-white/40">{index}</div><div><p className="text-xs font-bold text-white/55">Student seat {index}</p><p className="mt-1 text-[10px] text-white/30">Waiting to join</p></div></div>;
}


function RemoteScreenShare({
  participants,
}: {
  participants: Participant[];
}) {
  const sharer = participants.find((participant) => {
    const publication = participant.getTrackPublication(
      Track.Source.ScreenShare,
    );
    return Boolean(publication?.track);
  });

  if (!sharer) return null;

  const publication = sharer.getTrackPublication(
    Track.Source.ScreenShare,
  );

  if (!publication?.track) return null;

  const trackRef = {
    participant: sharer,
    source: Track.Source.ScreenShare,
    publication,
  } as any;

  return (
    <div className="relative mb-3 overflow-hidden rounded-3xl border border-blue-400/20 bg-black shadow-2xl">
      <VideoTrack
        trackRef={trackRef}
        className="aspect-video w-full object-contain"
      />
      <div className="absolute left-3 top-3 rounded-xl bg-black/65 px-3 py-2 text-xs font-black text-white backdrop-blur">
        {participantName(sharer)} is sharing their screen
      </div>
    </div>
  );
}

function ParticipantVideo({
  participant,
  large = false,
  compact = false,
  fill = false,
}: {
  participant: Participant;
  large?: boolean;
  compact?: boolean;
  fill?: boolean;
}) {
  const publication = participant.getTrackPublication(
    Track.Source.Camera,
  );

  const trackRef = publication?.track
    ? ({
        participant,
        source: Track.Source.Camera,
        publication,
      } as any)
    : null;

  const name = participantName(participant);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[#111725] ${
        compact ? `${fill ? "h-full" : "h-[124px] shrink-0"} min-h-0` : large ? "min-h-[360px] sm:min-h-[520px]" : "min-h-[180px]"
      }`}
    >
      {trackRef ? (
        <VideoTrack
          trackRef={trackRef}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="flex min-h-[inherit] items-center justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-2xl font-black text-white/80">
            {initials(name)}
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/75 to-transparent p-4 pt-14">
        <span className="rounded-xl bg-black/55 px-3 py-2 text-xs font-black text-white backdrop-blur">
          {name}
        </span>
        <MicBadge participant={participant} />
      </div>
    </div>
  );
}

function TeacherPreviewStage({
  participant,
  cameraEnabled,
  teacherName,
}: {
  participant: Participant;
  cameraEnabled: boolean;
  teacherName?: string;
}) {
  const publication = participant.getTrackPublication(
    Track.Source.Camera,
  );

  const trackRef =
    cameraEnabled && publication?.track
      ? ({
          participant,
          source: Track.Source.Camera,
          publication,
        } as any)
      : null;

  return (
    <div className="relative min-h-[55vh] overflow-hidden rounded-3xl border border-white/10 bg-[#111725] shadow-2xl sm:min-h-[65vh]">
      {trackRef ? (
        <VideoTrack
          trackRef={trackRef}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-[#111725] to-[#0d111b]">
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-2xl font-black text-white/80 ring-1 ring-white/15">
            {initials(teacherName || participantName(participant))}
          </span>
          <p className="mt-4 text-sm font-bold text-white/65">
            {cameraEnabled ? "Starting your camera…" : "Your camera is off"}
          </p>
          <p className="mt-1 text-xs text-white/40">Students will appear here when they join</p>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/80 via-black/20 to-transparent p-5 pt-20">
        <div>
          <p className="text-sm font-black text-white">{teacherName || "You"}</p>
          <p className="mt-1 text-xs text-white/65">{cameraEnabled ? "Camera on" : "Camera off"} · Waiting for students</p>
        </div>
        <span className="rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-[10px] font-black text-white/80 backdrop-blur">TEACHER</span>
      </div>
    </div>
  );
}

function MicBadge({ participant }: { participant: Participant }) {
  const publication = participant.getTrackPublication(
    Track.Source.Microphone,
  );
  const on = publication?.isMuted === false;

  return (
    <span className="rounded-xl bg-black/55 px-2.5 py-2 text-[10px] font-black text-white backdrop-blur">
      {on ? "Mic" : "Muted"}
    </span>
  );
}

function ParticipantRow({
  participant,
  compact = false,
}: {
  participant: Participant;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] ${
        compact ? "px-3 py-2" : "p-3"
      }`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-black">
        {initials(participantName(participant))}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-white/85">
          {participantName(participant)}
        </p>
        <p className="mt-0.5 text-[10px] text-emerald-300">
          Connected
        </p>
      </div>
    </div>
  );
}

function WaitingCard({
  role,
  teacherName,
}: {
  role: ClassroomRole;
  teacherName?: string;
}) {
  return (
    <div className="flex min-h-[520px] items-center justify-center rounded-3xl border border-white/10 bg-[#0d111b]">
      <div className="max-w-md px-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-xl font-black text-slate-950 shadow-2xl">
          <BrandLogo className="h-full w-full rounded-[inherit] object-cover" />
        </div>
        <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
          Classroom ready
        </p>
        <h2 className="mt-2 text-2xl font-black">
          {role === "TEACHER"
            ? "Waiting for students"
            : "Waiting for teacher"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-white/45">
          {role === "TEACHER"
            ? "Students will appear here automatically when they join."
            : teacherName
              ? `${teacherName} will appear here automatically when they join.`
              : "Your teacher will appear here automatically when they join."}
        </p>
      </div>
    </div>
  );
}

function Control({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2.5 text-xs font-black transition ${
        active
          ? "border-white/10 bg-white/10 text-white hover:bg-white/15"
          : "border-white/10 bg-red-500/15 text-red-200 hover:bg-red-500/25"
      }`}
    >
      {label}
    </button>
  );
}
