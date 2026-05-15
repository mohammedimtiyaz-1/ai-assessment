import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { sessionId: string } }) {
  const result = await query(
    `SELECT s.id, s.constraints_json, s.question_ids, s.started_at, s.status, s.user_id, s.guest_name
     FROM quiz_sessions s WHERE s.id = $1`,
    [params.sessionId]
  );
  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = result.rows[0];
  if (session.status !== "active") {
    return NextResponse.json({ error: "Session expired" }, { status: 410 });
  }

  const questionsRes = await query(
    `SELECT id, body, answers_json as answers FROM questions WHERE id = ANY($1)`,
    [session.question_ids]
  );

  const questions = questionsRes.rows.map((q) => ({
    id: q.id,
    body: q.body,
    answers: q.answers || [],
  }));

  return NextResponse.json({
    id: session.id,
    questions,
    timeLimitSec: session.constraints_json?.timeLimitSec || null,
    status: session.status,
    startedAt: session.started_at,
  });
}
