import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { query } from "@/lib/db";

export const GET = withAuth(async (req: NextRequest, user) => {
  const result = await query("SELECT id, email, name, role FROM users WHERE id = $1", [user.id]);
  if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result.rows[0]);
});

export const PATCH = withAuth(async (req: NextRequest, user) => {
  const body = await req.json().catch(() => ({}));
  const { name } = body;
  await query("UPDATE users SET name = $1, updated_at = now() WHERE id = $2", [name, user.id]);
  return NextResponse.json({ success: true });
});
