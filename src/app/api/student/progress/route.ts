import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/db";

export const GET = withAuth(async (req: NextRequest, user) => {
  const userId = user.id;
  const supabaseAdmin = getSupabaseAdmin();

  const [totalRes, activeRes] = await Promise.all([
    supabaseAdmin.from('quiz_sessions').select('score').eq('user_id', userId).eq('status', 'completed'),
    supabaseAdmin.from('quiz_sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  const totalAttempts = totalRes.data?.length || 0;
  const scores = (totalRes.data || []).map((r: any) => r.score).filter((s: any) => s != null);
  const averageScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
  const activeCount = activeRes.count || 0;
  const completionRate = activeCount > 0 ? Math.round((totalAttempts / activeCount) * 100) : 0;

  // Calculate weak areas based on question performance by content
  let weakAreas: string[] = [];
  if (totalAttempts > 0) {
    const { data: weakAreasData } = await supabaseAdmin
      .from('quiz_answers')
      .select('is_correct, quiz_sessions!inner(user_id, status), questions!inner(source_content_id), content!inner(title)')
      .eq('quiz_sessions.user_id', userId)
      .eq('quiz_sessions.status', 'completed');

    // Group by content title and calculate accuracy
    const contentAccuracy = new Map<string, { correct: number; total: number }>();
    (weakAreasData || []).forEach((row: any) => {
      const title = row.content?.title || "General";
      const current = contentAccuracy.get(title) || { correct: 0, total: 0 };
      current.total++;
      if (row.is_correct) current.correct++;
      contentAccuracy.set(title, current);
    });

    weakAreas = Array.from(contentAccuracy.entries())
      .filter(([_, stats]) => stats.total >= 3 && stats.correct / stats.total < 0.7)
      .map(([title]) => title)
      .slice(0, 3);
  }

  // Get recent trend (last 10 completed sessions with scores)
  const { data: recentTrendData } = await supabaseAdmin
    .from('quiz_sessions')
    .select('score, finished_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('finished_at', { ascending: false })
    .limit(10);

  const recentTrend = (recentTrendData || []).reverse().map((row: any) => ({
    score: row.score,
    date: row.finished_at,
  }));

  return NextResponse.json({
    totalAttempts,
    averageScore,
    completionRate,
    weakAreas,
    recentTrend,
  });
});
