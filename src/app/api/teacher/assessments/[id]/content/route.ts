import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { query } from "@/lib/db";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export const GET = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 2];

  const result = await query(
    `SELECT c.id, c.title, c.type 
     FROM assessment_content ac
     JOIN content c ON ac.content_id = c.id
     WHERE ac.assessment_id = $1`,
    [id]
  );
  return NextResponse.json({ linkedContent: result.rows });
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 2];
  const body = await req.json().catch(() => ({}));
  const { contentId } = body;

  if (!contentId) {
    return NextResponse.json({ error: "Content ID required" }, { status: 400 });
  }

  // Verify ownership
  const assessmentCheck = await query(
    "SELECT id FROM assessments WHERE id = $1 AND owner_user_id = $2",
    [id, user.id]
  );
  if (assessmentCheck.rows.length === 0) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  const contentCheck = await query(
    "SELECT id FROM content WHERE id = $1 AND owner_user_id = $2",
    [contentId, user.id]
  );
  if (contentCheck.rows.length === 0) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  await query(
    "INSERT INTO assessment_content (id, assessment_id, content_id) VALUES ($1, $2, $3)",
    [randomUUID(), id, contentId]
  );

  return NextResponse.json({ success: true });
});
