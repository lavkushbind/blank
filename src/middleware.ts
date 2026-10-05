import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes authenticate with bearer tokens or provider signatures inside
  // their handlers. Do not redirect fetch requests to an HTML sign-in page.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // The Cloud Run deployment exposes API routes only; web pages stay on the web host.
  if (process.env.BACKEND_ONLY === "true") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  // =========================================================
  // PUBLIC ROUTES
  // =========================================================

  const publicRoutes = [
    "/",
    "/login",
    "/admin-login",
    "/signup",

    // Separate authentication
    "/student-auth",
    "/teacher-auth",
    "/demo-booking",

    // Teacher application
    "/onboarding/teacher",

    // Public website
    "/teachers",
    "/for-teachers",
    "/how-it-works",
    "/pricing",
    "/faq",
    "/help",
    "/contact",
    "/privacy",
    "/terms",

    // Public APIs / APIs handle their own auth
    "/api/livekit",
    "/api/razorpay",
    "/api/demo",
  ];

  const isPublicRoute = publicRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // =========================================================
  // AUTH CHECK
  // =========================================================

  const session =
    request.cookies.get("__session")?.value ||
    request.cookies.get("session")?.value;

  // Not logged in
  if (!session) {
    const loginUrl = new URL(pathname === "/admin-console" ? "/admin-login" : "/student-auth", request.url);

    loginUrl.searchParams.set("redirect", pathname);

    return NextResponse.redirect(loginUrl);
  }

  // =========================================================
  // AUTHENTICATED
  // =========================================================

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
