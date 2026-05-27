import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { supabase, getSupabaseAdmin } from "@/lib/db";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export const POST = withAuth(async (req: NextRequest, user) => {
  const userId = user.id;

  const body = await req.json().catch(() => ({}));
  const contentId = body.contentId;
  const quizConfigurationId = body.quizConfigurationId;

  let questionIds: string[] = [];
  let contentTitle = "Practice Quiz";

  const supabaseAdmin = getSupabaseAdmin();

  // If quizConfigurationId is provided, use the pre-generated questions
  if (quizConfigurationId) {
    const { data: quizConfig, error } = await supabaseAdmin
      .from('quiz_configurations')
      .select('*, content!inner(title, owner_user_id)')
      .eq('id', quizConfigurationId)
      .eq('content.owner_user_id', userId)
      .single();

    if (error || !quizConfig) {
      return NextResponse.json({ error: "Quiz configuration not found" }, { status: 404 });
    }

    questionIds = (quizConfig as any).question_ids as string[];
    contentTitle = ((quizConfig as any).content as any)?.title;
  } else if (contentId) {
    // Fallback to old behavior - fetch questions by contentId
    const { data: content, error: contentError } = await supabaseAdmin
      .from('content')
      .select('*')
      .eq('id', contentId)
      .eq('owner_user_id', userId)
      .single();

    if (contentError || !content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    contentTitle = (content as any).title;

    const { data: questions } = await supabaseAdmin
      .from('questions')
      .select('id')
      .eq('source_content_id', contentId)
      .order('created_at', { ascending: true })
      .limit(10);

    questionIds = (questions || []).map((r: any) => r.id);
  } else {
    return NextResponse.json({ error: "Either contentId or quizConfigurationId is required" }, { status: 400 });
  }

  if (questionIds.length === 0) {
    return NextResponse.json({ error: "No questions available" }, { status: 400 });
  }

  const sessionId = randomUUID();
  const constraints = { timeLimitSec: 3600, resultVisibility: "immediate_full" };
  const now = new Date().toISOString();

  // Create a temporary assessment for student-generated quizzes
  const assessmentId = randomUUID();
  const { error: assessmentError } = await supabaseAdmin
    .from('assessments')
    .insert({
      id: assessmentId,
      owner_user_id: userId,
      title: `Practice: ${contentTitle}`,
      description: 'Student-generated practice quiz',
      config_json: constraints as any,
      status: 'published'
    } as any);

  if (assessmentError) {
    return NextResponse.json({ error: "Failed to create assessment" }, { status: 500 });
  }

  const { error: sessionError } = await supabaseAdmin
    .from('quiz_sessions')
    .insert({
      id: sessionId,
      user_id: userId,
      assessment_id: assessmentId,
      constraints_json: constraints as any,
      question_ids: questionIds,
      status: 'active',
      started_at: now
    } as any);

  if (sessionError) {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }

  return NextResponse.json({ sessionId });
});
