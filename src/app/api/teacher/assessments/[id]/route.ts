import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { supabase } from "@/lib/db";
import { z } from "zod";
import { logger } from "@/lib/logger";

const patchSchema = z.object({
  description: z.string().optional(),
  aiNote: z.string().optional(),
});

export const GET = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 1];

  logger.info({ id, userId: user.id, userEmail: user.email, userRole: user.role }, "Fetching assessment");

  const { data: assessment, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('id', id)
    .eq('owner_user_id', user.id)
    .single();
  
  if (error || !assessment) {
    // Check if assessment exists at all (without owner check)
    const { data: checkAny } = await supabase
      .from('assessments')
      .select('id, title, owner_user_id')
      .eq('id', id)
      .single();
    logger.info({ assessmentExists: !!checkAny }, "Assessment exists check");
    return NextResponse.json({ error: "Not found", debug: { userId: user.id, assessmentId: id, assessmentExists: !!checkAny } }, { status: 404 });
  }

  // Fetch question count
  const { count: questionCount } = await supabase
    .from('assessment_questions')
    .select('*', { count: 'exact', head: true })
    .eq('assessment_id', id);

  // Fetch submission count
  const { count: submissionCount } = await supabase
    .from('quiz_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('assessment_id', id)
    .eq('status', 'completed');

  // Fetch joined count (students who started but not completed)
  const { count: joinedCount } = await supabase
    .from('quiz_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('assessment_id', id)
    .eq('status', 'in_progress');

  // Fetch linked content
  const { data: linkedContent } = await supabase
    .from('assessment_content')
    .select('content!inner(id, title, type)')
    .eq('assessment_id', id);

  const { data: links } = await supabase
    .from('assessment_links')
    .select('token, active')
    .eq('assessment_id', id);

  return NextResponse.json({
    id: (assessment as any).id,
    title: (assessment as any).title,
    description: (assessment as any).description,
    ai_note: (assessment as any).ai_note,
    config_json: (assessment as any).config_json,
    status: (assessment as any).status,
    created_at: (assessment as any).created_at,
    owner_user_id: (assessment as any).owner_user_id,
    config: (assessment as any).config_json,
    linkedContent: (linkedContent || []).map((lc: any) => lc.content),
    links: links || [],
    questionCount: questionCount || 0,
    submissionCount: submissionCount || 0,
    joinedCount: joinedCount || 0,
  });
});

export const PATCH = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 1];

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { description, aiNote } = parsed.data;

  const { error } = await (supabase.from('assessments') as any)
    .update({
      description: description || null,
      ai_note: aiNote || null
    })
    .eq('id', id)
    .eq('owner_user_id', user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to update assessment" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
});
