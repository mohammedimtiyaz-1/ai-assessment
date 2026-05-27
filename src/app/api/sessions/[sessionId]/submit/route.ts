import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { supabase, getSupabaseAdmin } from "@/lib/db";
import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export const POST = async (req: NextRequest) => {
  const token = await getSession(req);
  const parts = req.nextUrl.pathname.split("/");
  const sessionId = parts[parts.length - 2];
  const body = await req.json().catch(() => ({}));
  const answers: Record<string, string> = body.answers || {};

  const supabaseAdmin = getSupabaseAdmin();

  const { data: session, error: sessionError } = await supabaseAdmin
    .from('quiz_sessions')
    .select('id, constraints_json, question_ids, user_id, guest_name, assessment_id, started_at, status')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const sessionData = session as any;
  if (token?.sub && sessionData.user_id && sessionData.user_id !== token.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check if assessment is closed
  const { data: assessment, error: assessmentError } = await supabaseAdmin
    .from('assessments')
    .select('status')
    .eq('id', sessionData.assessment_id)
    .single();

  if (assessment && (assessment as any).status === "closed") {
    return NextResponse.json({ error: "Assessment is closed and no longer accepting submissions" }, { status: 403 });
  }

  const now = new Date();
  // Temporarily disable time limit check for testing
  // if ((sessionData.constraints_json as any)?.timeLimitSec) {
  //   const elapsed = (now.getTime() - new Date(sessionData.started_at).getTime()) / 1000;
  //   if (elapsed > (sessionData.constraints_json as any).timeLimitSec) {
  //     return NextResponse.json({ error: "Time limit exceeded" }, { status: 410 });
  //   }
  // }

  const { data: questions, error: questionsError } = await supabaseAdmin
    .from('questions')
    .select('id, correct_answer_key')
    .in('id', sessionData.question_ids as string[]);

  if (questionsError) {
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }

  const correctMap = new Map((questions || []).map((q: any) => [q.id, q.correct_answer_key]));

  let correctCount = 0;
  const total = sessionData.question_ids.length;

  for (const [questionId, answerKey] of Object.entries(answers)) {
    const isCorrect = correctMap.get(questionId) === answerKey;
    if (isCorrect) correctCount++;
    const { error: insertError } = await supabaseAdmin
      .from('quiz_answers')
      .upsert({
        id: randomUUID(),
        session_id: sessionId,
        question_id: questionId,
        answer_key: answerKey,
        is_correct: isCorrect,
        answered_at: now.toISOString()
      } as any, { onConflict: 'session_id,question_id' });

    if (insertError) {
      logger.error({ error: insertError }, 'Failed to insert answer');
    }
  }

  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const { error: updateError } = await (supabaseAdmin.from('quiz_sessions') as any)
    .update({
      status: 'completed',
      finished_at: now.toISOString(),
      score
    })
    .eq('id', sessionId);

  if (updateError) {
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }

  return NextResponse.json({ success: true, score });
};
