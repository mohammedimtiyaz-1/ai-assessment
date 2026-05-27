import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/db";

export const GET = withAuth(async (req: NextRequest, user) => {
  const userId = user.id;
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from('quiz_sessions')
    .select('id, score, finished_at, status, assessments!inner(title)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }

  const attempts = (data || []).map((row: any) => ({
    id: row.id,
    assessment_title: row.assessments?.title || 'Practice',
    score: row.score,
    finished_at: row.finished_at,
    status: row.status,
  }));

  return NextResponse.json({ attempts });
});
