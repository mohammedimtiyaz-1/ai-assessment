import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { supabase } from "@/lib/db";
import { logger } from "@/lib/logger";

export const POST = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 2]; // Get the id before "start"

  // Check if assessment has questions
  const { data: aqData } = await supabase
    .from('assessment_questions')
    .select('question_id')
    .eq('assessment_id', id)
    .order('position', { ascending: true });
  
  const questionIds = (aqData || []).map((r: any) => r.question_id);
  if (questionIds.length === 0) {
    logger.warn({ assessmentId: id }, "Cannot start assessment: No questions available");
    return NextResponse.json({ error: "Cannot start assessment: No questions available" }, { status: 400 });
  }

  const { data: result, error } = await (supabase.from('assessments') as any)
    .update({ status: 'started' })
    .eq('id', id)
    .eq('owner_user_id', user.id)
    .select()
    .single();

  if (error || !result) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, assessment: result });
});
