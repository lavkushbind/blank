"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  RefreshCw,
} from "lucide-react";

import {
  auth,
} from "@/lib/firebase/client";

import LiveKitClassroom from "@/components/classroom/LiveKitClassroom";

/* =========================================================
   TYPES
========================================================= */

type TeacherSession = {
  id: string;

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

    role?: string;

    participantName?: string;

    title?: string;

    subject?: string;

    className?: string;
  };
};

/* =========================================================
   READ API RESPONSE
========================================================= */

async function readJson(
  response: Response,
) {
  const text =
    await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/* =========================================================
   PAGE
========================================================= */

export default function TeacherStudioPage() {
  const params =
    useParams<{
      sessionId: string;
    }>();

  const router =
    useRouter();

  const sessionId =
    String(
      params?.sessionId ||
        "",
    );

  const [
    session,
    setSession,
  ] =
    useState<TeacherSession | null>(
      null,
    );

  const [
    token,
    setToken,
  ] = useState("");

  const [
    serverUrl,
    setServerUrl,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  /* =======================================================
     DIRECT CLASSROOM LOAD

     NO:
     - status check
     - date check
     - time check
     - ended check
     - completed check
     - scheduled check
     - processing check

     ONLY:
     authentication -> token -> classroom
  ======================================================= */

  const loadClassroom =
    useCallback(
      async (
        user: NonNullable<
          typeof auth.currentUser
        >,
      ) => {
        setLoading(true);

        setError("");

        setToken("");

        setServerUrl("");

        try {
          if (!sessionId) {
            throw new Error(
              "Invalid classroom id.",
            );
          }

          /*
           * Firebase login token.
           */
          const idToken =
            await user.getIdToken(
              true,
            );

          /*
           * =================================================
           * DIRECT TOKEN REQUEST
           * =================================================
           *
           * No session status request.
           * No PATCH request.
           * No timing validation.
           *
           * Just request LiveKit access directly.
           */

          const response =
            await fetch(
              "/api/livekit/token",
              {
                method:
                  "POST",

                headers: {
                  Authorization:
                    `Bearer ${idToken}`,

                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify(
                    {
                      sessionId,
                    },
                  ),

                cache:
                  "no-store",
              },
            );

          const data: TokenResponse =
            await readJson(
              response,
            );

          /*
           * We only need LiveKit credentials.
           */

          if (
            !response.ok
          ) {
            console.error(
              "LiveKit token API failed:",
              {
                status:
                  response.status,

                data,
              },
            );

            throw new Error(
              data.message ||
                data.error ||
                `LiveKit token request failed (${response.status}).`,
            );
          }

          if (
            !data.token
          ) {
            throw new Error(
              "LiveKit token missing.",
            );
          }

          if (
            !data.serverUrl
          ) {
            throw new Error(
              "LiveKit server URL missing.",
            );
          }

          /*
           * No role/status validation here.
           *
           * Teacher is already authenticated
           * through teacher studio.
           */

          setSession({
            id:
              data.session?.id ||
              sessionId,

            role:
              "TEACHER",

            participantName:
              data.session
                ?.participantName ||
              data.participantName ||
              user.displayName ||
              user.email?.split(
                "@",
              )[0] ||
              "Teacher",

            title:
              data.session
                ?.title,

            subject:
              data.session
                ?.subject,

            className:
              data.session
                ?.className,
          });

          setToken(
            data.token,
          );

          setServerUrl(
            data.serverUrl,
          );
        } catch (
          classroomError
        ) {
          console.error(
            "Teacher classroom error:",
            classroomError,
          );

          setSession(
            null,
          );

          setToken("");

          setServerUrl("");

          setError(
            classroomError instanceof
              Error
              ? classroomError.message
              : "Unable to open classroom.",
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [sessionId],
    );

  /* =======================================================
     AUTH
  ======================================================= */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {
          if (!user) {
            setLoading(
              false,
            );

            setError(
              "Teacher login is required.",
            );

            return;
          }

          /*
           * Login found ->
           * DIRECTLY load classroom.
           */

          void loadClassroom(
            user,
          );
        },
      );

    return () => {
      unsubscribe();
    };
  }, [loadClassroom]);

  /* =======================================================
     LEAVE

     Leave only navigates away.
     Classroom is NOT ended.
  ======================================================= */

  function handleLeave() {
    router.push(
      "/dashboard",
    );
  }

  /* =======================================================
     END CLASS

     For now we intentionally DO NOT mark
     the session ENDED.

     This means teacher can leave and
     open the same classroom again.
  ======================================================= */

  function handleEndClass() {
    router.push(
      "/dashboard",
    );
  }

  /* =======================================================
     RETRY
  ======================================================= */

  async function handleRetry() {
    const user =
      auth.currentUser;

    if (!user) {
      setError(
        "Teacher login is required.",
      );

      return;
    }

    await loadClassroom(
      user,
    );
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <StudioState>
        <div className="relative grid h-16 w-16 place-items-center rounded-[22px] border border-white/10 bg-white/[0.06]">
          <div className="absolute inset-0 rounded-[22px] bg-blue-500/15 blur-xl" />

          <Loader2
            size={28}
            className="relative animate-spin text-blue-400"
          />
        </div>

        <h1 className="mt-6 text-xl font-black tracking-tight text-white">
          Opening classroom
        </h1>

        <p className="mt-2 max-w-sm text-center text-sm leading-6 text-white/40">
          Connecting you
          directly to the
          classroom.
        </p>
      </StudioState>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (
    error ||
    !session ||
    !token ||
    !serverUrl
  ) {
    return (
      <StudioState>
        <div className="grid h-16 w-16 place-items-center rounded-[22px] border border-red-400/10 bg-red-500/10 text-red-400">
          <AlertCircle
            size={28}
          />
        </div>

        <h1 className="mt-6 text-xl font-black tracking-tight text-white">
          Classroom connection
          failed
        </h1>

        <p className="mt-2 max-w-md text-center text-sm leading-6 text-white/45">
          {error ||
            "Live classroom credentials are unavailable."}
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() =>
              void handleRetry()
            }
            className="inline-flex items-center gap-2 rounded-[14px] bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500"
          >
            <RefreshCw
              size={16}
            />

            Retry
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard",
              )
            }
            className="inline-flex items-center gap-2 rounded-[14px] border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-bold text-white/70 transition hover:bg-white/10"
          >
            <ArrowLeft
              size={16}
            />

            Dashboard
          </button>
        </div>
      </StudioState>
    );
  }

  /* =======================================================
     DIRECT LIVEKIT CLASSROOM
  ======================================================= */

  return (
    <div className="relative min-h-screen bg-slate-950">
      <LiveKitClassroom
        token={token}
        serverUrl={
          serverUrl
        }
        role="TEACHER"
        sessionId={
          sessionId
        }
        className={
          session.className
        }
        subject={
          session.subject
        }
        lessonTitle={
          session.title
        }
        teacherName={
          session.participantName
        }
        onLeave={
          handleLeave
        }
        onEndClass={
          handleEndClass
        }
      />
    </div>
  );
}

/* =========================================================
   STATE UI
========================================================= */

function StudioState({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#07101f] px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-220px] h-[520px] w-[700px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[120px]" />

        <div className="absolute bottom-[-260px] right-[-100px] h-[480px] w-[480px] rounded-full bg-indigo-500/10 blur-[110px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center">
        {children}
      </div>
    </main>
  );
}