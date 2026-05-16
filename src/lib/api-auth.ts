import { NextRequest, NextResponse } from "next/server";
import { getToken, decode } from "next-auth/jwt";
import { env } from "./env";

export async function getSession(req: NextRequest) {
  const isSecure = process.env.NODE_ENV === "production";
  const cookieName = isSecure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const rawToken = await getToken({
    req: req as any,
    secret: env.NEXTAUTH_SECRET,
    salt: cookieName,
    cookieName,
    secureCookie: isSecure,
    raw: true,
  });

  if (!rawToken || typeof rawToken !== "string") return null;

  const decoded = await decode({
    token: rawToken,
    secret: env.NEXTAUTH_SECRET,
    salt: cookieName,
  });

  return decoded;
}

export function withAuth(
  handler: (req: NextRequest, user: { id: string; email: string; role: string }) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const token = await getSession(req);
    if (!token?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = {
      id: token.sub as string,
      email: token.email as string,
      role: token.role as string,
    };
    return handler(req, user);
  };
}
