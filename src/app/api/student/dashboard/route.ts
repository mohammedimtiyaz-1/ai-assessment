import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { supabase } from "@/lib/db";
import { logger } from "@/lib/logger";

export const GET = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  logger.info({ userId: user.id, role }, "Dashboard API hit");
  if (!["student", "teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [userRes, contentCountRes, attemptStatsRes, accuracyRes, recentSessionsRes, recentContentRes] = await Promise.all([
      supabase.from('users').select('name').eq('id', user.id).single(),
      supabase.from('content').select('*', { count: 'exact', head: true }).eq('owner_user_id', user.id),
      supabase.from('quiz_sessions').select('id, status').eq('user_id', user.id),
      supabase.from('quiz_sessions').select('score').eq('user_id', user.id).eq('status', 'completed').not('score', 'is', null),
      supabase.from('quiz_sessions').select('id, score, status, finished_at, assessments!inner(title)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(4),
      supabase.from('content').select('id, title, type').eq('owner_user_id', user.id).order('created_at', { ascending: false }).limit(5),
    ]);

    const contentCount = contentCountRes.count || 0;
    const allSessions = attemptStatsRes.data || [];
    const total = allSessions.length;
    const completed = allSessions.filter((s: any) => s.status === 'completed').length;
    const active = allSessions.filter((s: any) => s.status === 'active').length;
    
    const accuracyScores = (accuracyRes.data || []).map((s: any) => s.score).filter((s: any) => s != null);
    const accuracy = accuracyScores.length > 0 ? Math.round(accuracyScores.reduce((a: number, b: number) => a + b, 0) / accuracyScores.length) : null;

    const recentContent = (recentContentRes.data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      type: row.type,
      score: null,
      status: null,
      progress: 0,
    }));

    return NextResponse.json({
      userName: (userRes.data as any)?.name || user.email,
      contentCount,
      attemptCount: total,
      completedCount: completed,
      inProgressCount: active,
      accuracy,
      quickAction: { label: "Start Practice Quiz", href: "/student/quiz" },
      recentContent,
      recentAttempts: (recentSessionsRes.data || []).map((row: any) => ({
        id: row.id,
        assessmentTitle: row.assessments?.title,
        score: row.score,
        status: row.status,
        finishedAt: row.finished_at,
      })),
    });
  } catch (err) {
    logger.error({ userId: user.id, error: err }, "Dashboard API error");
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
});
