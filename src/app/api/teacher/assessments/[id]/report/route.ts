import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { supabase } from "@/lib/db";

export const GET = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 2];

  const { data: assessRes } = await supabase
    .from('assessments')
    .select('title')
    .eq('id', id)
    .eq('owner_user_id', user.id)
    .single();
  
  if (!assessRes) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { count: totalRes } = await supabase
    .from('quiz_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('assessment_id', id);

  const { data: completedData } = await supabase
    .from('quiz_sessions')
    .select('score')
    .eq('assessment_id', id)
    .eq('status', 'completed');
  
  const completions = completedData?.length || 0;
  const averageScore = completions > 0 
    ? Math.round((completedData || []).reduce((sum: number, s: any) => sum + (s.score || 0), 0) / completions)
    : null;

  const { data: studentsRes } = await supabase
    .from('quiz_sessions')
    .select('user_id, guest_name, score, finished_at, users!inner(name)')
    .eq('assessment_id', id)
    .order('created_at', { ascending: false });

  const studentResults = (studentsRes || []).map((s: any) => ({
    name: s.users?.name || s.guest_name || 'Guest',
    score: s.score,
    finished_at: s.finished_at
  }));

  return NextResponse.json({
    assessmentTitle: (assessRes as any).title,
    totalAttempts: totalRes || 0,
    completions,
    averageScore,
    studentResults,
  });
});
