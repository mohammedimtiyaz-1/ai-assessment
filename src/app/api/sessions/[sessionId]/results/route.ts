import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId;
  const supabaseAdmin = getSupabaseAdmin();

  // Get session details
  const { data: sessionData } = await supabaseAdmin
    .from('quiz_sessions')
    .select('id, score, started_at, finished_at, status, question_ids, constraints_json')
    .eq('id', sessionId)
    .single();

  if (!sessionData) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const session = sessionData as any;

  if (session.status !== "completed") {
    return NextResponse.json({ error: "Quiz not completed yet" }, { status: 400 });
  }

  // Get questions with correct answers
  const { data: questionsData } = await supabaseAdmin
    .from('questions')
    .select('id, body, answers_json, correct_answer_key')
    .in('id', session.question_ids);

  // Get user answers
  const { data: answersData } = await supabaseAdmin
    .from('quiz_answers')
    .select('question_id, answer_key, is_correct, answered_at')
    .eq('session_id', sessionId);

  const answersMap = new Map(
    (answersData || []).map((a: any) => [a.question_id, { answerKey: a.answer_key, isCorrect: a.is_correct, answeredAt: a.answered_at }])
  );

  const questionsWithAnswers = (questionsData || []).map((q: any) => {
    const userAnswer = answersMap.get(q.id);
    // Parse answers_json if it's a string
    const answers = typeof q.answers_json === 'string' 
      ? JSON.parse(q.answers_json) 
      : q.answers_json;
    return {
      id: q.id,
      body: q.body,
      answers: answers,
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
