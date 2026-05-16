import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Rate limiting store (in-memory for development, should use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100; // Max 100 requests per window per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  record.count++;
  return true;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
             req.headers.get('x-real-ip') || 
             'unknown';
  return ip;
}

export default async function middleware(req: NextRequest) {
  const { nextUrl } = req;

  const isPublicPage = ["/", "/login", "/signup", "/forgot-password"].includes(nextUrl.pathname);
  const isPublicLink = nextUrl.pathname.startsWith("/a/");
  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isApiRoute = nextUrl.pathname.startsWith("/api");

  // Apply rate limiting to auth endpoints
  if (isApiAuthRoute || ["/login", "/signup"].includes(nextUrl.pathname)) {
    const ip = getClientIp(req);
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }
  }

  // Allow API routes (auth is handled by withAuth wrapper)
  if (isApiRoute) {
    return NextResponse.next();
  }

  // Allow public links
  if (isPublicLink) {
    return NextResponse.next();
  }

  const anyGetToken: any = getToken;
  const token = await anyGetToken({ req, secret: process.env.NEXTAUTH_SECRET! });
  const isLoggedIn = !!token;
  const userRole = (token as any)?.role as string | undefined;

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && ["/login", "/signup", "/forgot-password"].includes(nextUrl.pathname)) {
    const redirectTo = userRole && ["teacher", "admin", "super_admin"].includes(userRole) 
      ? "/dashboard" 
      : "/student/dashboard";
    return NextResponse.redirect(new URL(redirectTo, nextUrl));
  }

  // Role-based access control for protected routes
  if (isLoggedIn) {
    // Teacher-only routes
    const teacherOnlyRoutes = [
      "/dashboard",
      "/teacher/assessments",
      "/teacher/assessments/create",
    ];
    
    const isTeacherOnlyRoute = teacherOnlyRoutes.some(route => 
      nextUrl.pathname === route || nextUrl.pathname.startsWith(route + "/")
    );
    
    if (isTeacherOnlyRoute && !["teacher", "admin", "super_admin"].includes(userRole || "")) {
      return NextResponse.redirect(new URL("/student/dashboard", nextUrl));
    }

    // Student-only routes
    const studentOnlyRoutes = [
      "/student/dashboard",
      "/student/upload",
      "/student/content",
      "/student/quiz",
      "/student/history",
      "/student/progress",
    ];
    
    const isStudentOnlyRoute = studentOnlyRoutes.some(route => 
      nextUrl.pathname === route || nextUrl.pathname.startsWith(route + "/")
    );
    
    if (isStudentOnlyRoute && userRole !== "student") {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
  }

  // Redirect unauthenticated users to login
  if (!isLoggedIn && !isPublicPage) {
    const callbackUrl = nextUrl.pathname + nextUrl.search;
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
