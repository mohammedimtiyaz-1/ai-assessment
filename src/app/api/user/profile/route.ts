import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

export const GET = auth(async (req) => {
  if (!req.auth?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await query("SELECT id, email, name, role FROM users WHERE id = $1", [req.auth.user.id]);
  if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result.rows[0]);
});

export const PATCH = auth(async (req) => {
  if (!req.auth?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { name } = body;
  await query("UPDATE users SET name = $1, updated_at = now() WHERE id = $2", [name, req.auth.user.id]);
  return NextResponse.json({ success: true });
});
