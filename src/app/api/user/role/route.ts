import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { supabase } from "@/lib/db";
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

  const { error } = await (supabase.from('users') as any)
    .update({ role: parsed.data.role, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
});
