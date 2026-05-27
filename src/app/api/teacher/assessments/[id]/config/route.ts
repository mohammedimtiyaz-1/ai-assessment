import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { supabase } from "@/lib/db";
import { z } from "zod";

const configSchema = z.object({
  timeLimitSec: z.number().optional(),
  requireLogin: z.boolean().optional(),
  resultVisibility: z.string().optional(),
});

export const runtime = "nodejs";

export const PATCH = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 2];

  const body = await req.json().catch(() => ({}));
  const parsed = configSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { timeLimitSec, requireLogin, resultVisibility } = parsed.data;

  // Verify ownership
  const { data: assessmentCheck } = await supabase
    .from('assessments')
    .select('id, config_json')
    .eq('id', id)
    .eq('owner_user_id', user.id)
    .single();
  
  if (!assessmentCheck) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  const currentConfig = ((assessmentCheck as any).config_json as any) || {};
  const updatedConfig = {
    ...currentConfig,
    ...(timeLimitSec !== undefined && { timeLimitSec }),
    ...(requireLogin !== undefined && { requireLogin }),
    ...(resultVisibility !== undefined && { resultVisibility }),
  };

  const { error } = await (supabase.from('assessments') as any)
    .update({ config_json: updatedConfig as any })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }

  return NextResponse.json({ success: true, config: updatedConfig });
});
