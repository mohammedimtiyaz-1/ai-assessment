import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId;

  // Get session details
  const sessionRes = await query(
    `SELECT s.id, s.score, s.started_at, s.finished_at, s.status, s.question_ids, s.constraints_json
     FROM quiz_sessions s WHERE s.id = $1`,
    [sessionId]
  );

  if (sessionRes.rows.length === 0) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const session = sessionRes.rows[0];

  if (session.status !== "completed") {
    return NextResponse.json({ error: "Quiz not completed yet" }, { status: 400 });
  }

  // Get questions with correct answers
  const questionsRes = await query(
    `SELECT id, body, answers_json, correct_answer_key FROM questions WHERE id = ANY($1)`,
    [session.question_ids]
  );

  // Get user answers
  const answersRes = await query(
    `SELECT question_id, answer_key, is_correct, answered_at FROM quiz_answers WHERE session_id = $1`,
    [sessionId]
  );

  const answersMap = new Map(
    answersRes.rows.map((a: any) => [a.question_id, { answerKey: a.answer_key, isCorrect: a.is_correct, answeredAt: a.answered_at }])
  );

  const questionsWithAnswers = questionsRes.rows.map((q: any) => {
    const userAnswer = answersMap.get(q.id);
    return {
      id: q.id,
      body: q.body,
      answers: q.answers_json,
      correctAnswer: q.correct_answer_key,
      userAnswer: userAnswer?.answerKey || null,
      isCorrect: userAnswer?.isCorrect || false,
    };
  });

  const correctCount = questionsWithAnswers.filter((q: any) => q.isCorrect).length;
  const total = questionsWithAnswers.length;
  const score = session.score || Math.round((correctCount / total) * 100);

  // Calculate time taken
  const timeTaken = session.finished_at && session.started_at
    ? Math.round((new Date(session.finished_at).getTime() - new Date(session.started_at).getTime()) / 1000)
    : null;

  return NextResponse.json({
    sessionId: session.id,
    score,
    correctCount,
    total,
    timeTaken,
    startedAt: session.started_at,
    finishedAt: session.finished_at,
    questions: questionsWithAnswers,
  });
}
