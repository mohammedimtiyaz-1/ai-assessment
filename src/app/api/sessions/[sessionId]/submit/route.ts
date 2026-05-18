import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { query } from "@/lib/db";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export const POST = async (req: NextRequest) => {
  const token = await getSession(req);
  const parts = req.nextUrl.pathname.split("/");
  const sessionId = parts[parts.length - 2];
  const body = await req.json().catch(() => ({}));
  const answers: Record<string, string> = body.answers || {};

  const sessionRes = await query(
    `SELECT id, constraints_json, question_ids, user_id, guest_name, assessment_id, started_at, status
     FROM quiz_sessions WHERE id = $1`,
    [sessionId]
  );
  if (sessionRes.rows.length === 0) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const session = sessionRes.rows[0];

  if (token?.sub && session.user_id && session.user_id !== token.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check if assessment is closed
  const assessmentRes = await query(
    "SELECT status FROM assessments WHERE id = $1",
    [session.assessment_id]
  );
  if (assessmentRes.rows.length > 0 && assessmentRes.rows[0].status === "closed") {
    return NextResponse.json({ error: "Assessment is closed and no longer accepting submissions" }, { status: 403 });
  }

  const now = new Date();
  if (session.constraints_json?.timeLimitSec) {
    const elapsed = (now.getTime() - new Date(session.started_at).getTime()) / 1000;
    if (elapsed > session.constraints_json.timeLimitSec) {
      return NextResponse.json({ error: "Time limit exceeded" }, { status: 410 });
    }
  }

  const questionsRes = await query("SELECT id, correct_answer_key FROM questions WHERE id = ANY($1)", [session.question_ids]);
  const correctMap = new Map(questionsRes.rows.map((q: any) => [q.id, q.correct_answer_key]));

  let correctCount = 0;
  const total = session.question_ids.length;

  for (const [questionId, answerKey] of Object.entries(answers)) {
    const isCorrect = correctMap.get(questionId) === answerKey;
    if (isCorrect) correctCount++;
    await query(
      `INSERT INTO quiz_answers (id, session_id, question_id, answer_key, is_correct, answered_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (session_id, question_id) DO UPDATE SET answer_key = EXCLUDED.answer_key, is_correct = EXCLUDED.is_correct`,
      [randomUUID(), sessionId, questionId, answerKey, isCorrect, now]
    );
  }

  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  await query(
    "UPDATE quiz_sessions SET status = 'completed', finished_at = $1, score = $2 WHERE id = $3",
    [now, score, sessionId]
  );

  return NextResponse.json({ success: true, score });
};
