"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";

import {
  arrayUnion,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase/client";
import { BrandLogo } from "@/components/BrandLogo";

export default function TeacherAuthPage() {
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [error, setError] = useState("");

  /* ============================================================
     CREATE / LINK TEACHER PROFILE
     ============================================================ */

  const createTeacherProfile = async (
    uid: string,
    teacherName: string,
    teacherEmail: string
  ) => {
    if (!uid) {
      throw new Error(
        "Missing Firebase Auth UID."
      );
    }

    const userRef = doc(
      db,
      "users",
      uid
    );

    const teacherRef = doc(
      db,
      "teachers",
      uid
    );

    const userSnap =
      await getDoc(userRef);

    const teacherSnap =
      await getDoc(teacherRef);

    const existingUser =
      userSnap.exists()
        ? userSnap.data()
        : null;

    /*
     * ==========================================================
     * USERS
     * ==========================================================
     *
     * roles is canonical.
     *
     * Existing STUDENT role is NOT a problem.
     */

    const existingRoles =
      Array.isArray(
        existingUser?.roles
      )
        ? existingUser.roles
        : [];

    const roles = Array.from(
      new Set([
        ...existingRoles,
        "TEACHER",
      ])
    );

    /*
     * Teacher becomes the legacy primary role.
     *
     * This keeps old code compatible while
     * roles remains the proper source of truth.
     */

    await setDoc(
      userRef,
      {
        uid,

        name:
          teacherName ||
          existingUser?.name ||
          "Teacher",

        email:
          teacherEmail ||
          existingUser?.email ||
          null,

        roles,

        role: "TEACHER",

        updatedAt:
          serverTimestamp(),

        ...(userSnap.exists()
          ? {}
          : {
              createdAt:
                serverTimestamp(),
            }),
      },
      {
        merge: true,
      }
    );

    /*
     * ==========================================================
     * TEACHERS
     * ==========================================================
     *
     * IMPORTANT:
     *
     * teachers/{uid}
     *
     * Never addDoc().
     * Never random document ID.
     */

    if (!teacherSnap.exists()) {
      /*
       * New teacher.
       */

      await setDoc(
        teacherRef,
        {
          uid,

          name:
            teacherName ||
            "Teacher",

          email:
            teacherEmail ||
            null,

          role: "TEACHER",

          applicationStatus:
            "INCOMPLETE",

          kycStatus:
            "PENDING",

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );
    } else {
      /*
       * EXISTING TEACHER.
       *
       * Only update identity fields.
       *
       * DO NOT overwrite:
       *
       * applicationStatus
       * kycStatus
       * boards
       * classes
       * subjects
       * slots
       * KYC
       * payout
       * bio
       * profile photo
       * demo video
       */

      await setDoc(
        teacherRef,
        {
          uid,

          name:
            teacherName ||
            teacherSnap.data()?.name ||
            "Teacher",

          email:
            teacherEmail ||
            teacherSnap.data()?.email ||
            null,

          role: "TEACHER",

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );
    }
  };

  /* ============================================================
     SESSION COOKIE
     ============================================================ */

  const createSession = async () => {
    const currentUser =
      auth.currentUser;

    if (!currentUser) {
      throw new Error(
        "Authentication session not found."
      );
    }

    const token =
      await currentUser.getIdToken(
        true
      );

    document.cookie =
      `__session=${token}; path=/; max-age=86400; SameSite=Lax`;

    document.cookie =
      `user_role=TEACHER; path=/; max-age=86400; SameSite=Lax`;
  };

  /* ============================================================
     ROUTE TEACHER
     ============================================================ */

  const routeTeacher = async (
    uid: string
  ) => {
    const teacherRef =
      doc(
        db,
        "teachers",
        uid
      );

    const teacherSnap =
      await getDoc(
        teacherRef
      );

    /*
     * No teacher profile.
     *
     * This can happen if the auth account
     * exists but teacher onboarding hasn't
     * been initialized yet.
     */

    if (!teacherSnap.exists()) {
      await createTeacherProfile(
        uid,
        auth.currentUser
          ?.displayName ||
          auth.currentUser
            ?.email
            ?.split("@")[0] ||
          "Teacher",
        auth.currentUser
          ?.email || ""
      );

      router.replace(
        "/onboarding/teacher"
      );

      return;
    }

    const teacher =
      teacherSnap.data();

    const applicationStatus =
      teacher.applicationStatus;

    const kycStatus =
      teacher.kycStatus;

    /*
     * Application not completed.
     */

    if (
      !applicationStatus ||
      applicationStatus ===
        "INCOMPLETE" ||
      applicationStatus ===
        "PENDING"
    ) {
      await createSession();

      router.replace(
        "/onboarding/teacher"
      );

      return;
    }

    /*
     * Application submitted but
     * approval/KYC incomplete.
     */

    if (
      applicationStatus !==
        "APPROVED" ||
      kycStatus !==
        "VERIFIED"
    ) {
      await createSession();

      router.replace(
        "/onboarding/teacher"
      );

      return;
    }

    /*
     * Fully approved teacher.
     */

    await createSession();

    router.replace(
      "/dashboard"
    );
  };

  /* ============================================================
     PERSISTENT SESSION
     ============================================================ */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
          try {
            if (!user) {
              setCheckingSession(
                false
              );
              return;
            }

            /*
             * Existing Firebase session.
             *
             * Automatically continue teacher flow.
             */
            await routeTeacher(
              user.uid
            );
          } catch (err) {
            console.error(
              "Teacher session restore error:",
              err
            );

            setCheckingSession(
              false
            );
          }
        }
      );

    return unsubscribe;
  }, []);

  /* ============================================================
     GOOGLE
     ============================================================ */

  const handleGoogle =
    async () => {
      setGoogleLoading(true);
      setError("");

      try {
        const provider =
          new GoogleAuthProvider();

        provider.setCustomParameters(
          {
            prompt:
              "select_account",
          }
        );

        const result =
          await signInWithPopup(
            auth,
            provider
          );

        const user =
          result.user;

        const teacherName =
          user.displayName?.trim() ||
          user.email?.split(
            "@"
          )[0] ||
          "Teacher";

        /*
         * This is important:
         *
         * If this Google account already
         * has a student profile, that's okay.
         *
         * We simply add TEACHER capability.
         */

        await createTeacherProfile(
          user.uid,
          teacherName,
          user.email || ""
        );

        await routeTeacher(
          user.uid
        );
      } catch (err: any) {
        console.error(
          "Teacher Google authentication error:",
          err
        );

        switch (
          err?.code
        ) {
          case "auth/popup-closed-by-user":
            setError(
              "Google sign-in was cancelled."
            );
            break;

          case "auth/popup-blocked":
            setError(
              "Please allow popups in your browser."
            );
            break;

          case "auth/network-request-failed":
            setError(
              "Network error. Please try again."
            );
            break;

          case "auth/account-exists-with-different-credential":
            setError(
              "An account already exists with this email. Please use email login."
            );
            break;

          default:
            setError(
              "Google sign-in failed. Please try again."
            );
        }
      } finally {
        setGoogleLoading(
          false
        );
      }
    };

  /* ============================================================
     EMAIL LOGIN / SIGNUP
     ============================================================ */

  const handleEmailAuth =
    async (
      e: FormEvent
    ) => {
      e.preventDefault();

      setError("");

      const cleanEmail =
        email
          .trim()
          .toLowerCase();

      if (!cleanEmail) {
        setError(
          "Please enter your email."
        );
        return;
      }

      if (!password) {
        setError(
          "Please enter your password."
        );
        return;
      }

      if (
        !isLogin &&
        !name.trim()
      ) {
        setError(
          "Please enter your name."
        );
        return;
      }

      if (
        password.length < 6
      ) {
        setError(
          "Password must contain at least 6 characters."
        );
        return;
      }

      setLoading(true);

      try {
        /* ======================================================
           LOGIN
           ====================================================== */

        if (isLogin) {
          const credential =
            await signInWithEmailAndPassword(
              auth,
              cleanEmail,
              password
            );

          const user =
            credential.user;

          /*
           * IMPORTANT:
           *
           * NO:
           *
           * role === STUDENT
           * => reject
           *
           * anymore.
           *
           * If teacher profile exists,
           * we continue teacher flow.
           */

          await createTeacherProfile(
            user.uid,
            user.displayName?.trim() ||
              user.email?.split(
                "@"
              )[0] ||
              "Teacher",
            user.email ||
              cleanEmail
          );

          await routeTeacher(
            user.uid
          );

          return;
        }

        /* ======================================================
           SIGNUP
           ====================================================== */

        const credential =
          await createUserWithEmailAndPassword(
            auth,
            cleanEmail,
            password
          );

        const user =
          credential.user;

        await updateProfile(
          user,
          {
            displayName:
              name.trim(),
          }
        );

        /*
         * Create teacher capability.
         */
        await createTeacherProfile(
          user.uid,
          name.trim(),
          user.email ||
            cleanEmail
        );

        await createSession();

        /*
         * New teacher must complete
         * application.
         */
        router.replace(
          "/onboarding/teacher"
        );
      } catch (err: any) {
        console.error(
          "Teacher email authentication error:",
          err
        );

        switch (
          err?.code
        ) {
          case "auth/invalid-credential":
          case "auth/wrong-password":
            setError(
              "Incorrect email or password."
            );
            break;

          case "auth/user-not-found":
            setError(
              "No account found with this email."
            );
            break;

          case "auth/email-already-in-use":
            setError(
              "An account already exists with this email. Please sign in."
            );
            break;

          case "auth/invalid-email":
            setError(
              "Please enter a valid email address."
            );
            break;

          case "auth/weak-password":
            setError(
              "Password must contain at least 6 characters."
            );
            break;

          case "auth/too-many-requests":
            setError(
              "Too many attempts. Please try again later."
            );
            break;

          default:
            setError(
              "Something went wrong. Please try again."
            );
        }
      } finally {
        setLoading(false);
      }
    };

  /* ============================================================
     SWITCH MODE
     ============================================================ */

  const switchMode =
    () => {
      setError("");
      setName("");
      setPassword("");

      setIsLogin(
        (value) => !value
      );
    };

  /* ============================================================
     SESSION CHECK
     ============================================================ */

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">

          <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#0B1020] text-sm font-bold text-white">
            <BrandLogo className="h-full w-full rounded-[inherit] object-cover" />
          </div>

          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-[#2563EB]" />

          <p className="text-sm font-medium text-slate-500">
            Restoring your teacher session...
          </p>

        </div>
      </main>
    );
  }

  /* ============================================================
     UI
     ============================================================ */

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F8FAFC] text-[#0B1020]">

      <div className="pointer-events-none absolute inset-0">

        <div
          className="absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              "linear-gradient(#E7ECF3 1px, transparent 1px), linear-gradient(90deg, #E7ECF3 1px, transparent 1px)",
            backgroundSize:
              "44px 44px",
          }}
        />

        <div className="absolute right-[7%] top-[12%] h-[300px] w-[300px] rounded-full bg-blue-200/25 blur-[110px]" />

        <div className="absolute bottom-[4%] left-[7%] h-[280px] w-[280px] rounded-full bg-indigo-200/20 blur-[110px]" />

      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10 lg:px-14">

        <button
          onClick={() =>
            router.push("/")
          }
          className="group flex items-center gap-3"
        >

          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#0B1020] text-sm font-bold text-white">
            <BrandLogo className="h-full w-full rounded-[inherit] object-cover" />
          </div>

          <div className="text-left">

            <div className="text-[19px] font-bold tracking-[-0.03em]">
              BlankLearn
            </div>

            <div className="text-[8px] font-bold tracking-[0.25em] text-[#2563EB]">
              LIVE LEARNING
            </div>

          </div>

        </button>

        <button
          onClick={() =>
            router.push("/")
          }
          className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-[#52627A] transition hover:bg-white hover:text-[#0B1020] sm:block"
        >
          Back to home
        </button>

      </header>

      <section className="relative z-10 flex min-h-[calc(100vh-84px)] items-center justify-center px-5 pb-12 pt-4 sm:px-8">

        <div className="w-full max-w-[470px]">

          <div className="mb-5 text-center">

            <span className="inline-flex items-center gap-2 rounded-full border border-[#DCE5F1] bg-white px-4 py-2 text-xs font-semibold text-[#52627A] shadow-sm">

              <span className="h-2 w-2 rounded-full bg-[#2563EB]" />

              {isLogin
                ? "Teacher portal"
                : "Join BlankLearn teachers"}

            </span>

          </div>

          <div className="rounded-[28px] border border-[#E3E8F0] bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,.09)] sm:p-10">

            <div className="text-center">

              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#0B1020] text-white">
                <TeacherIcon />
              </div>

              <h1 className="text-[32px] font-bold tracking-[-0.045em] sm:text-[36px]">

                {isLogin
                  ? "Welcome back, teacher."
                  : "Teach with BlankLearn."}

              </h1>

              <p className="mx-auto mt-3 max-w-[370px] text-[15px] leading-6 text-[#64748B]">

                {isLogin
                  ? "Manage your classes, students and teaching schedule."
                  : "Create your teacher account and start your application."}

              </p>

            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={
                loading ||
                googleLoading
              }
              className="mt-8 flex h-[52px] w-full items-center justify-center gap-3 rounded-[14px] border border-[#DDE3EC] bg-white text-[15px] font-semibold text-[#172033] transition hover:-translate-y-[1px] hover:border-[#C7D0DD] hover:shadow-[0_10px_30px_rgba(15,23,42,.08)] disabled:cursor-not-allowed disabled:opacity-60"
            >

              {googleLoading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#D7DDE7] border-t-[#0B1020]" />
              ) : (
                <GoogleIcon />
              )}

              <span>
                {googleLoading
                  ? "Connecting..."
                  : "Continue with Google"}
              </span>

            </button>

            <div className="my-7 flex items-center gap-4">

              <div className="h-px flex-1 bg-[#E8ECF2]" />

              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#94A3B8]">
                OR
              </span>

              <div className="h-px flex-1 bg-[#E8ECF2]" />

            </div>

            {error && (
              <div className="mb-5 rounded-[13px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-medium text-[#DC2626]">
                {error}
              </div>
            )}

            <form
              onSubmit={handleEmailAuth}
              className="space-y-5"
            >

              {!isLogin && (
                <div>

                  <label className="mb-2 block text-[13px] font-bold text-[#263248]">
                    Full name
                  </label>

                  <input
                    value={name}
                    onChange={(e) =>
                      setName(
                        e.target.value
                      )
                    }
                    placeholder="Enter your full name"
                    autoComplete="name"
                    className="h-[52px] w-full rounded-[14px] border border-[#DDE3EC] bg-[#F8FAFC] px-4 text-[15px] outline-none transition-all placeholder:text-[#9AA5B5] focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                  />

                </div>
              )}

              <div>

                <label className="mb-2 block text-[13px] font-bold text-[#263248]">
                  Email address
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target.value
                    )
                  }
                  placeholder="teacher@example.com"
                  autoComplete="email"
                  className="h-[52px] w-full rounded-[14px] border border-[#DDE3EC] bg-[#F8FAFC] px-4 text-[15px] outline-none transition-all placeholder:text-[#9AA5B5] focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                />

              </div>

              <div>

                <label className="mb-2 block text-[13px] font-bold text-[#263248]">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  placeholder="Enter your password"
                  autoComplete={
                    isLogin
                      ? "current-password"
                      : "new-password"
                  }
                  className="h-[52px] w-full rounded-[14px] border border-[#DDE3EC] bg-[#F8FAFC] px-4 text-[15px] outline-none transition-all placeholder:text-[#9AA5B5] focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                />

              </div>

              <button
                type="submit"
                disabled={
                  loading ||
                  googleLoading
                }
                className="flex h-[53px] w-full items-center justify-center rounded-[14px] bg-[#2563EB] text-[15px] font-bold text-white shadow-[0_12px_25px_rgba(37,99,235,.20)] transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
              >

                {loading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    {isLogin
                      ? "Sign in to teacher portal"
                      : "Create teacher account"}

                    <span className="ml-2 text-lg">
                      →
                    </span>
                  </>
                )}

              </button>

            </form>

            <div className="mt-7 text-center text-[14px] text-[#64748B]">

              {isLogin
                ? "New to BlankLearn?"
                : "Already have an account?"}

              <button
                type="button"
                onClick={switchMode}
                className="ml-1 font-bold text-[#0B1020] hover:text-[#2563EB]"
              >
                {isLogin
                  ? "Create account"
                  : "Sign in"}
              </button>

            </div>

            <div className="mt-7 border-t border-[#EEF1F5] pt-6 text-center">

              <p className="text-xs text-[#94A3B8]">
                Looking for classes for your child?
              </p>

              <button
                onClick={() =>
                  router.push(
                    "/student-auth"
                  )
                }
                className="mt-1 text-[14px] font-bold text-[#0B1020] transition hover:text-[#2563EB]"
              >
                Go to student login →
              </button>

            </div>

          </div>

          <p className="mt-5 text-center text-[11px] leading-5 text-[#94A3B8]">
            Teacher accounts require application completion
            and verification before teaching.
          </p>

        </div>

      </section>

    </main>
  );
}

/* ================================================================
   TEACHER ICON
   ================================================================ */

function TeacherIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />

      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />

      <path d="M8 6h8" />

      <path d="M8 10h6" />
    </svg>
  );
}

/* ================================================================
   GOOGLE ICON
   ================================================================ */

function GoogleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
    >
      <path
        d="M21.8 12.23c0-.79-.07-1.55-.22-2.28H12v4.31h5.49a4.7 4.7 0 0 1-2.04 3.08v2.55h3.3c1.93-1.78 3.05-4.4 3.05-7.66Z"
        fill="#4285F4"
      />

      <path
        d="M12 22c2.76 0 5.08-.91 6.77-2.46l-3.3-2.55c-.91.61-2.07.97-3.47.97-2.67 0-4.94-1.8-5.75-4.23H2.84v2.63A10.23 10.23 0 0 0 12 22Z"
        fill="#34A853"
      />

      <path
        d="M6.25 13.73A6.14 6.14 0 0 1 5.93 12c0-.6.11-1.19.32-1.73V7.64H2.84A10.01 10.01 0 0 0 1.75 12c0 1.61.39 3.13 1.09 4.36l3.41-2.63Z"
        fill="#FBBC05"
      />

      <path
        d="M12 6.04c1.5 0 2.84.52 3.9 1.54l2.92-2.92C17.07 2.98 14.76 2 12 2a10.23 10.23 0 0 0-9.16 5.64l3.41 2.63 3.41 2.63C7.06 7.84 9.33 6.04 12 6.04Z"
        fill="#EA4335"
      />
    </svg>
  );
}