import { NextResponse } from "next/server";
import { supabase, getSupabaseAdmin } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { sessionId: string } }) {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: session, error: sessionError } = await supabaseAdmin
    .from('quiz_sessions')
    .select('id, constraints_json, question_ids, started_at, status, user_id, guest_name')
    .eq('id', params.sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if ((session as any).status !== "active") {
    return NextResponse.json({ error: "Session expired" }, { status: 410 });
  }

  const { data: questions, error: questionsError } = await supabaseAdmin
    .from('questions')
    .select('id, body, answers_json')
    .in('id', (session as any).question_ids as string[]);

  if (questionsError) {
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }

  const questionsMapped = (questions || []).map((q: any) => ({
    id: q.id,
    body: q.body,
    answers: typeof q.answers_json === 'string' ? JSON.parse(q.answers_json) : (q.answers_json || []),
  }));

  return NextResponse.json({
    id: (session as any).id,
    questions: questionsMapped,
    timeLimitSec: ((session as any).constraints_json as any)?.timeLimitSec || null,
    status: (session as any).status,
    startedAt: (session as any).started_at,
  });
}
