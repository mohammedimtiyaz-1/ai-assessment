import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { query } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  role: z.enum(["student", "teacher", "admin"]),
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  await query("UPDATE users SET role = $1, updated_at = now() WHERE id = $2", [
    parsed.data.role,
    user.id,
  ]);

  return NextResponse.json({ success: true });
});
