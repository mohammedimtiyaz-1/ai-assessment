import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getSessionToken(req: NextRequest): string | undefined {
  const token = req.cookies.get("next-auth.session-token")?.value;
  if (token) return token;
  // For secure cookies (production)
  return req.cookies.get("__Secure-next-auth.session-token")?.value;
}

export default function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const token = getSessionToken(req);
  const isLoggedIn = !!token;

  const isPublicPage = ["/", "/login", "/signup", "/forgot-password"].includes(nextUrl.pathname);
  const isPublicLink = nextUrl.pathname.startsWith("/a/");
  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isApiRoute = nextUrl.pathname.startsWith("/api");

  if (isApiAuthRoute || isApiRoute || isPublicLink) {
    return NextResponse.next();
  }

  if (isLoggedIn && ["/login", "/signup", "/forgot-password"].includes(nextUrl.pathname)) {
    const redirectTo = "/student/dashboard";
    return NextResponse.redirect(new URL(redirectTo, nextUrl));
  }

  if (!isLoggedIn && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
