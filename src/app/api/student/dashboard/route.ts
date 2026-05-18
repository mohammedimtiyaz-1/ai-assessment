import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { query } from "@/lib/db";
import { logger } from "@/lib/logger";

export const GET = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  logger.info({ userId: user.id, role }, "Dashboard API hit");
  if (!["student", "teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [userRes, contentCountRes, attemptStatsRes, accuracyRes, recentSessionsRes, recentContentRes] = await Promise.all([
      query("SELECT name FROM users WHERE id = $1", [user.id]),
      query("SELECT COUNT(*) as count FROM content WHERE owner_user_id = $1", [user.id]),
      query(
        `SELECT
           COUNT(*)::int as total,
           COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
           COUNT(*) FILTER (WHERE status = 'active')::int as active
         FROM quiz_sessions
         WHERE user_id = $1`,
        [user.id]
      ),
      query(`SELECT ROUND(AVG(score))::int as avg_score FROM quiz_sessions WHERE user_id = $1 AND status = 'completed' AND score IS NOT NULL`, [user.id]),
      query(
        `SELECT qs.id, qs.score, qs.status, qs.finished_at, a.title as assessment_title
         FROM quiz_sessions qs
         JOIN assessments a ON qs.assessment_id = a.id
         WHERE qs.user_id = $1
         ORDER BY qs.created_at DESC
         LIMIT 4`,
        [user.id]
      ),
      query(
        `SELECT c.id, c.title, c.type,
          qs.score,
          qs.status,
          CASE
            WHEN qs.status = 'completed' THEN 100
            WHEN qs.status = 'active' THEN 50
            ELSE 0
          END as progress
         FROM content c
         LEFT JOIN LATERAL (
           SELECT qs.score, qs.status
           FROM quiz_sessions qs
           JOIN assessment_content ac ON ac.assessment_id = qs.assessment_id
           WHERE ac.content_id = c.id AND qs.user_id = $1
           ORDER BY qs.created_at DESC
           LIMIT 1
         ) qs ON true
         WHERE c.owner_user_id = $1
         ORDER BY c.created_at DESC
         LIMIT 5`,
        [user.id]
      ),
    ]);

    const contentCount = parseInt(contentCountRes.rows[0]?.count ?? "0", 10);
    const attemptStats = attemptStatsRes.rows[0] || { total: 0, completed: 0, active: 0 };
    const accuracyRow = accuracyRes.rows[0];
    const accuracy = accuracyRow?.avg_score !== null && accuracyRow?.avg_score !== undefined ? parseInt(accuracyRow.avg_score, 10) : null;
    const recentContent = recentContentRes.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      type: row.type,
      score: row.score,
      status: row.status,
      progress: row.progress ?? 0,
    }));

    return NextResponse.json({
      userName: userRes.rows[0]?.name || user.email,
      contentCount,
      attemptCount: attemptStats.total ?? 0,
      completedCount: attemptStats.completed ?? 0,
      inProgressCount: attemptStats.active ?? 0,
      accuracy,
      quickAction: { label: "Start Practice Quiz", href: "/student/quiz" },
      recentContent,
      recentAttempts: recentSessionsRes.rows.map((row: any) => ({
        id: row.id,
        assessmentTitle: row.assessment_title,
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
