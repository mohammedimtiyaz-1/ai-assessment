import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { randomUUID } from "crypto";

export const POST = auth(async (req) => {
  if (!req.auth?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = req.auth.user.id;

  const body = await req.json().catch(() => ({}));
  const contentId = body.contentId;

  const contentRes = await query("SELECT * FROM content WHERE id = $1 AND owner_user_id = $2", [contentId, userId]);
  if (contentRes.rows.length === 0) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  const questionsRes = await query(
    "SELECT id FROM questions WHERE source_content_id = $1 ORDER BY created_at LIMIT 10",
    [contentId]
  );
  const questionIds = questionsRes.rows.map((r) => r.id);

  if (questionIds.length === 0) {
    return NextResponse.json({ error: "No questions available for this content" }, { status: 400 });
  }

  const sessionId = randomUUID();
  const constraints = { timeLimitSec: 900, resultVisibility: "immediate_full" };

  await query(
    `INSERT INTO quiz_sessions (id, user_id, assessment_id, constraints_json, question_ids, status)
     VALUES ($1, $2, NULL, $3, $4, 'active')`,
    [sessionId, userId, JSON.stringify(constraints), questionIds]
  );

  return NextResponse.json({ sessionId });
});
