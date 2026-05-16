import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { query } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  description: z.string().optional(),
  aiNote: z.string().optional(),
});

export const GET = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 1];

  const result = await query(
    "SELECT * FROM assessments WHERE id = $1 AND owner_user_id = $2",
    [id, user.id]
  );
  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const assessment = result.rows[0];

  // Fetch linked content
  const linkedContentRes = await query(
    `SELECT c.id, c.title, c.type 
     FROM assessment_content ac
     JOIN content c ON ac.content_id = c.id
     WHERE ac.assessment_id = $1`,
    [id]
  );

  const linksRes = await query(
    "SELECT token, active FROM assessment_links WHERE assessment_id = $1",
    [id]
  );

  return NextResponse.json({
    ...assessment,
    linkedContent: linkedContentRes.rows,
    links: linksRes.rows,
  });
});

export const PATCH = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 1];

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { description, aiNote } = parsed.data;

  await query(
    "UPDATE assessments SET description = COALESCE($1, description), ai_note = COALESCE($2, ai_note) WHERE id = $3 AND owner_user_id = $4",
    [description || null, aiNote || null, id, user.id]
  );

  return NextResponse.json({ success: true });
});
