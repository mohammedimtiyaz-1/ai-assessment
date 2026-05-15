import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  const isPublicPage = ["/", "/login", "/signup", "/forgot-password"].includes(nextUrl.pathname);
  const isPublicLink = nextUrl.pathname.startsWith("/a/");
  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isApiRoute = nextUrl.pathname.startsWith("/api");

  if (isApiAuthRoute || isApiRoute || isPublicPage || isPublicLink) {
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  const isStudentRoute = nextUrl.pathname.startsWith("/student");
  const isTeacherRoute = nextUrl.pathname.startsWith("/teacher") || nextUrl.pathname.startsWith("/dashboard");

  if (isTeacherRoute && !["teacher", "admin", "super_admin"].includes(userRole || "")) {
    return NextResponse.redirect(new URL("/student/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
