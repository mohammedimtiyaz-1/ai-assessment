import { NextRequest, NextResponse } from "next/server";
import { getToken, decode } from "next-auth/jwt";
import { query } from "@/lib/db";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map((c) => c.split("=")).map(([k, ...v]) => [k, v.join("=")])
  );

  const rawToken = await getToken({
    req: req as any,
    secret: env.NEXTAUTH_SECRET,
    cookieName: "next-auth.session-token",
    secureCookie: false,
    raw: true,
  });

  let decodedToken = null;
  let decodeError = null;
  try {
    if (rawToken) {
      decodedToken = await decode({
        token: rawToken,
        secret: env.NEXTAUTH_SECRET,
      });
    }
  } catch (e: any) {
    decodeError = e.message;
  }

  const dbNameRes = await query("SELECT current_database() as db");
  const tablesRes = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");

  let contentQueryResult = null;
  let contentQueryError = null;
  try {
    const r = await query("SELECT COUNT(*) as count FROM content WHERE owner_user_id = '00000000-0000-0000-0000-000000000000'");
    contentQueryResult = r.rows[0].count;
  } catch (e: any) {
    contentQueryError = e.message;
  }

  const pool = (query as any).pool || (globalThis as any).__dbPool;
  const connStr = pool?.options?.connectionString || env.DATABASE_URL;

  return NextResponse.json({
    cookies,
    rawTokenExists: !!rawToken,
    decodedTokenExists: !!decodedToken,
    decodeError,
    decodedToken,
    db: dbNameRes.rows[0].db,
    tables: tablesRes.rows.map((r: any) => r.table_name),
    contentQueryResult,
    contentQueryError,
    connStr: connStr ? connStr.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') : null,
  });
}
