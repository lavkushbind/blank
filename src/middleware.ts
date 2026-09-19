import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("__session")?.value;
  const role = request.cookies.get("user_role")?.value; // TEACHER, STUDENT, PARENT, ADMIN

  const isAuthPage = pathname === "/login" || pathname === "/signup";

  // 1. If already logged in and visits /login or /signup -> Redirect to portal directly!
  if (isAuthPage && sessionToken && role) {
    if (role === "TEACHER") return NextResponse.redirect(new URL("/dashboard", request.url));
    if (role === "STUDENT") return NextResponse.redirect(new URL("/hub", request.url));
    if (role === "PARENT") return NextResponse.redirect(new URL("/home", request.url));
    if (role === "ADMIN") return NextResponse.redirect(new URL("/kyc-approval", request.url));
  }

  const isTeacherRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/accreditation") || pathname.startsWith("/batches") || pathname.startsWith("/studio") || pathname.startsWith("/post-class");
  const isStudentRoute = pathname.startsWith("/hub") || pathname.startsWith("/quiz") || pathname.startsWith("/vault") || pathname.startsWith("/badges") || pathname.startsWith("/classroom");
  const isParentRoute = pathname.startsWith("/home") || pathname.startsWith("/link-child") || pathname.startsWith("/demo-booking") || pathname.startsWith("/report") || pathname.startsWith("/remarks") || pathname.startsWith("/billing");
  const isAdminRoute = pathname.startsWith("/kyc-approval") || pathname.startsWith("/batch-builder") || pathname.startsWith("/live-radar") || pathname.startsWith("/payouts") || pathname.startsWith("/analytics");

  // Public routes bypass
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/sounds") ||
    pathname.startsWith("/wasm") ||
    pathname.startsWith("/assets") ||
    pathname === "/" ||
    pathname.startsWith("/teachers") ||
    pathname.startsWith("/how-it-works") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/for-teachers") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/faq") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/demo-booking") ||
    isAuthPage
  ) {
    return NextResponse.next();
  }

  // Not logged in -> Redirect to login
  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sounds|wasm|assets).*)",
  ],
};