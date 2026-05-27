import { NextRequest, NextResponse } from "next/server";
import { getToken, decode } from "next-auth/jwt";
import { supabase } from "@/lib/db";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  if (env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const secret = env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "NEXTAUTH_SECRET is not configured" }, { status: 503 });
  }

  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map((c) => c.split("=")).map(([k, ...v]) => [k, v.join("=")])
  );

  const rawToken = await getToken({
    req: req as any,
    secret,
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
        secret,
      });
    }
  } catch (e: any) {
    decodeError = e.message;
  }

  // Get database name using Supabase client
  const { data: dbNameData } = await supabase.rpc('current_database');
  const dbName = dbNameData || 'unknown';
  
  // Get tables using Supabase client
  const { data: tablesData } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .order('table_name');
  
  const tables = (tablesData || []).map((r: any) => r.table_name);

  let contentQueryResult = null;
  let contentQueryError = null;
  try {
    const { count } = await supabase
      .from('content')
      .select('*', { count: 'exact', head: true })
      .eq('owner_user_id', '00000000-0000-0000-0000-000000000000');
    contentQueryResult = count;
  } catch (e: any) {
    contentQueryError = e.message;
  }

  const connStr = env.DATABASE_URL ? env.DATABASE_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') : null;

  return NextResponse.json({
    cookies,
    rawTokenExists: !!rawToken,
    decodedTokenExists: !!decodedToken,
    decodeError,
    decodedToken,
    db: dbName,
    tables,
    contentQueryResult,
    contentQueryError,
    connStr,
  });
}
