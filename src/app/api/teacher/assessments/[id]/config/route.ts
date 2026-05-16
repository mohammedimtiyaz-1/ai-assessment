import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { query } from "@/lib/db";
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
  const assessmentCheck = await query(
    "SELECT id, config_json FROM assessments WHERE id = $1 AND owner_user_id = $2",
    [id, user.id]
  );
  if (assessmentCheck.rows.length === 0) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  const currentConfig = assessmentCheck.rows[0].config_json || {};
  const updatedConfig = {
    ...currentConfig,
    ...(timeLimitSec !== undefined && { timeLimitSec }),
    ...(requireLogin !== undefined && { requireLogin }),
    ...(resultVisibility !== undefined && { resultVisibility }),
  };

  await query(
    "UPDATE assessments SET config_json = $1 WHERE id = $2",
    [JSON.stringify(updatedConfig), id]
  );

  return NextResponse.json({ success: true, config: updatedConfig });
});
