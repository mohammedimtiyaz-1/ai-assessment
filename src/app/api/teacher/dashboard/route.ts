import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { supabase } from "@/lib/db";
import { logger } from "@/lib/logger";

export const GET = withAuth(async (req: NextRequest, user) => {
  const userId = user.id;
  const role = user.role;
  logger.info({ userId, userEmail: user.email, role }, "Dashboard API called");
  
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [assessmentsRes, countRes, publishedRes] = await Promise.all([
    supabase.from('assessments').select('id, title, status, created_at, owner_user_id').eq('owner_user_id', userId).order('created_at', { ascending: false }).limit(10),
    supabase.from('assessments').select('*', { count: 'exact', head: true }).eq('owner_user_id', userId),
    supabase.from('assessments').select('*', { count: 'exact', head: true }).eq('owner_user_id', userId).eq('status', 'published'),
  ]);

  // Get assessment IDs for attempts count
  const { data: userAssessments } = await supabase.from('assessments').select('id').eq('owner_user_id', userId);
  const assessmentIds = (userAssessments || []).map((a: any) => a.id);
  
  const attemptsRes = assessmentIds.length > 0 
    ? await supabase.from('quiz_sessions').select('*', { count: 'exact', head: true }).in('assessment_id', assessmentIds)
    : { count: 0 };

  logger.info({ userId, count: assessmentsRes.data?.length }, "Dashboard assessments query");

  return NextResponse.json({
    assessmentCount: countRes.count || 0,
    publishedCount: publishedRes.count || 0,
    totalAttempts: attemptsRes.count || 0,
    recentAssessments: assessmentsRes.data || [],
  });
});
