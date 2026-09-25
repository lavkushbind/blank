"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
} from "lucide-react";

import { auth } from "@/lib/firebase/client";
import LiveKitClassroom from "@/components/classroom/LiveKitClassroom";

type SessionStatus =
  | "SCHEDULED"
  | "PREPARING"
  | "OPEN_FOR_JOIN"
  | "LIVE"
  | "ENDED"
  | "CANCELLED";

type TeacherSession = {
  id: string;
  status: SessionStatus;
  role: "TEACHER";
  participantName: string;
  title?: string;
  subject?: string;
  className?: string;
};

type TokenResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  token?: string;
  serverUrl?: string;
  roomName?: string;
  participantName?: string;
  session?: {
    id?: string;
    status?: string;
    role?: string;
    participantName?: string;
    title?: string;
    subject?: string;
    className?: string;
  };
};

type StatusResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  session?: {
    id?: string;
    status?: string;
  };
};

const VALID_STATUSES: SessionStatus[] = [
  "SCHEDULED",
  "PREPARING",
  "OPEN_FOR_JOIN",
  "LIVE",
  "ENDED",
  "CANCELLED",
];

function isSessionStatus(value: unknown): value is SessionStatus {
  return (
    typeof value === "string" &&
    VALID_STATUSES.includes(value as SessionStatus)
  );
}

async function readJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export default function TeacherStudioPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();

  const sessionId = String(params?.sessionId || "");

  const [session, setSession] = useState<TeacherSession | null>(null);
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const loadClassroom = useCallback(
    async (user: NonNullable<typeof auth.currentUser>) => {
      setLoading(true);
      setError("");

      try {
        if (!sessionId) {
          throw new Error("Invalid class session.");
        }

        const idToken = await user.getIdToken();

        const response = await fetch(
          `/api/livekit/token?sessionId=${encodeURIComponent(sessionId)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
            cache: "no-store",
          },
        );

        const data: TokenResponse = await readJson(response);

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || data.error || "Unable to open classroom.",
          );
        }

        if (!data.token || !data.serverUrl) {
          throw new Error(
            "Live classroom credentials were not returned.",
          );
        }

        if (data.session?.role !== "TEACHER") {
          throw new Error(
            "Teacher access is required for this classroom.",
          );
        }

        const status = data.session?.status;
        if (!isSessionStatus(status)) {
          throw new Error("Invalid classroom session status.");
        }

        let classroomStatus = status;
        if (["SCHEDULED", "PREPARING", "OPEN_FOR_JOIN"].includes(status)) {
          const startResponse = await fetch(
            `/api/class_sessions/${encodeURIComponent(sessionId)}/status`,
            {
              method: "PATCH",
              headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({ status: "LIVE" }),
            },
          );
          const startData: StatusResponse = await readJson(startResponse);
          if (!startResponse.ok || !startData.success) {
            throw new Error(startData.message || startData.error || "Unable to start this class.");
          }
          classroomStatus = "LIVE";
        }

        setSession({
          id: sessionId,
          status: classroomStatus,
          role: "TEACHER",
          participantName:
            data.session?.participantName ||
            data.participantName ||
            user.displayName ||
            "Teacher",
          title: data.session?.title,
          subject: data.session?.subject,
          className: data.session?.className,
        });

        setToken(data.token);
        setServerUrl(data.serverUrl);
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (/Teacher cannot join a ENDED session\./i.test(message)) {
          setSession({
            id: sessionId,
            status: "ENDED",
            role: "TEACHER",
            participantName: user.displayName || "Teacher",
          });
          setToken("");
          setServerUrl("");
          setError("");
          return;
        }

        console.error("Teacher classroom loading error:", err);
        setSession(null);
        setToken("");
        setServerUrl("");
        setError(
          err instanceof Error
            ? err.message
            : "Unable to open classroom.",
        );
      } finally {
        setLoading(false);
      }
    },
    [sessionId],
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setLoading(false);
        setError("Teacher login is required.");
        return;
      }

      void loadClassroom(user);
    });

    return () => unsubscribe();
  }, [loadClassroom]);

  const updateStatus = useCallback(
    async (
      nextStatus: "OPEN_FOR_JOIN" | "LIVE" | "ENDED",
    ) => {
      const user = auth.currentUser;

      if (!user) {
        setError("Teacher login is required.");
        return false;
      }

      setActionLoading(true);
      setError("");

      try {
        const idToken = await user.getIdToken();

        const response = await fetch(
          `/api/class_sessions/${encodeURIComponent(sessionId)}/status`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${idToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: nextStatus,
            }),
          },
        );

        const data: StatusResponse = await readJson(response);

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              data.error ||
              "Unable to update class status.",
          );
        }

        const returnedStatus = data.session?.status;
        const finalStatus = isSessionStatus(returnedStatus)
          ? returnedStatus
          : nextStatus;

        setSession((current) =>
          current ? { ...current, status: finalStatus } : current,
        );

        return true;
      } catch (err) {
        console.error("Class status update error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to update class status.",
        );
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [sessionId],
  );

  async function handleEndClass() {
    if (
      !session ||
      actionLoading ||
      session.status !== "LIVE"
    ) {
      return;
    }

    const success = await updateStatus("ENDED");

    if (success) {
      router.push(
        `/post-class/${encodeURIComponent(sessionId)}`,
      );
    }
  }

  function handleLeave() {
    router.push("/batches");
  }

  if (loading) {
    return (
      <StudioState>
        <Loader2 size={32} className="animate-spin text-blue-400" />
        <p className="mt-4 text-sm font-bold text-white/50">
          Opening classroom...
        </p>
      </StudioState>
    );
  }

  if (session?.status === "ENDED") {
    return (
      <StudioState>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white/70">
          <AlertCircle size={26} />
        </div>
        <h1 className="mt-5 text-xl font-black text-white">This class has ended</h1>
        <p className="mt-2 max-w-md text-center text-sm leading-6 text-white/50">
          This classroom is closed, so it can’t be joined again. You can return to your dashboard or open the class follow-up.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => router.push("/dashboard")} className="rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-white/80 hover:bg-white/5">
            Dashboard
          </button>
          <button type="button" onClick={() => router.push(`/post-class/${encodeURIComponent(sessionId)}`)} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-500">
            Class follow-up
          </button>
        </div>
      </StudioState>
    );
  }

  if (error && (!session || !token || !serverUrl)) {
    return (
      <StudioState>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
          <AlertCircle size={28} />
        </div>
        <h1 className="mt-5 text-xl font-black text-white">
          Unable to open classroom
        </h1>
        <p className="mt-2 max-w-md text-center text-sm leading-6 text-white/45">
          {error}
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950"
        >
          <ArrowLeft size={16} />
          Go Back
        </button>
      </StudioState>
    );
  }

  if (!session || !token || !serverUrl) {
    return (
      <StudioState>
        <p className="text-sm font-bold text-white/50">
          Classroom information is unavailable.
        </p>
      </StudioState>
    );
  }

return (
    <div className="relative min-h-screen bg-slate-950">
      <LiveKitClassroom
        token={token}
        serverUrl={serverUrl}
        role="TEACHER"
        sessionId={sessionId}
        className={session.className}
        subject={session.subject}
        lessonTitle={session.title}
        teacherName={session.participantName}
        onLeave={handleLeave}
        onEndClass={handleEndClass}
      />

      {error && (
        <div className="fixed bottom-24 left-1/2 z-[60] w-[calc(100%-32px)] max-w-lg -translate-x-1/2 rounded-2xl border border-red-400/20 bg-red-950/95 p-4 text-sm font-semibold text-red-100 shadow-2xl">
          {error}
        </div>
      )}
    </div>
  );
}

function StudioState({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6">
      {children}
    </main>
  );
}
