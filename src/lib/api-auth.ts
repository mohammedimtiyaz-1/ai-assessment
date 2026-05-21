import { NextRequest, NextResponse } from "next/server";
import { getToken, decode } from "next-auth/jwt";
import { env } from "./env";

export async function getSession(req: NextRequest) {
  const token = await getToken({
    req: req as any,
    secret: env.NEXTAUTH_SECRET,
  });

  return token;
}

export function withAuth(
  handler: (req: NextRequest, user: { id: string; email: string; role: string }) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const token = await getSession(req);
    if (!token || !token.sub) {
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
