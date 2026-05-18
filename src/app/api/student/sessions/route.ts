import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { query } from "@/lib/db";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export const POST = withAuth(async (req: NextRequest, user) => {
  const userId = user.id;

  const body = await req.json().catch(() => ({}));
  const contentId = body.contentId;
  const quizConfigurationId = body.quizConfigurationId;

  let questionIds: string[] = [];
  let contentTitle = "Practice Quiz";

  // If quizConfigurationId is provided, use the pre-generated questions
  if (quizConfigurationId) {
    const quizConfigRes = await query(
      `SELECT qc.*, c.title as content_title
       FROM quiz_configurations qc
       JOIN content c ON qc.content_id = c.id
       WHERE qc.id = $1 AND c.owner_user_id = $2`,
      [quizConfigurationId, userId]
    );

    if (quizConfigRes.rows.length === 0) {
      return NextResponse.json({ error: "Quiz configuration not found" }, { status: 404 });
    }

    const quizConfig = quizConfigRes.rows[0];
    questionIds = quizConfig.question_ids;
    contentTitle = quizConfig.content_title;
  } else if (contentId) {
    // Fallback to old behavior - fetch questions by contentId
    const contentRes = await query("SELECT * FROM content WHERE id = $1 AND owner_user_id = $2", [contentId, userId]);
    if (contentRes.rows.length === 0) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    contentTitle = contentRes.rows[0].title;

    const questionsRes = await query(
      "SELECT id FROM questions WHERE source_content_id = $1 ORDER BY created_at LIMIT 10",
      [contentId]
    );
    questionIds = questionsRes.rows.map((r) => r.id);
  } else {
    return NextResponse.json({ error: "Either contentId or quizConfigurationId is required" }, { status: 400 });
  }

  if (questionIds.length === 0) {
    return NextResponse.json({ error: "No questions available" }, { status: 400 });
  }

  const sessionId = randomUUID();
  const constraints = { timeLimitSec: 900, resultVisibility: "immediate_full" };

  // Create a temporary assessment for student-generated quizzes
  const assessmentId = randomUUID();
  await query(
    `INSERT INTO assessments (id, owner_user_id, title, description, config_json, status)
     VALUES ($1, $2, $3, $4, $5, 'published')`,
    [assessmentId, userId, `Practice: ${contentTitle}`, 'Student-generated practice quiz', JSON.stringify(constraints)]
  );

  await query(
    `INSERT INTO quiz_sessions (id, user_id, assessment_id, constraints_json, question_ids, status)
     VALUES ($1, $2, $3, $4, $5, 'active')`,
    [sessionId, userId, assessmentId, JSON.stringify(constraints), questionIds]
  );

  return NextResponse.json({ sessionId });
});
