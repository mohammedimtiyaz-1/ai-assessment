import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  role: z.enum(["student", "teacher", "admin"]),
});

export const POST = auth(async (req) => {
  if (!req.auth?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  await query("UPDATE users SET role = $1, updated_at = now() WHERE id = $2", [
    parsed.data.role,
    req.auth.user.id,
  ]);

  return NextResponse.json({ success: true });
});
