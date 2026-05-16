import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { query } from "@/lib/db";

export const GET = withAuth(async (req: NextRequest, user) => {
  const userId = user.id;

  const totalRes = await query(
    "SELECT COUNT(*) as count, COALESCE(AVG(score), 0) as avg FROM quiz_sessions WHERE user_id = $1 AND status = 'completed'",
    [userId]
  );
  const activeRes = await query("SELECT COUNT(*) as count FROM quiz_sessions WHERE user_id = $1", [userId]);

  const totalAttempts = parseInt(totalRes.rows[0].count, 10);
  const averageScore = totalAttempts > 0 ? Math.round(parseFloat(totalRes.rows[0].avg)) : 0;
  const activeCount = parseInt(activeRes.rows[0].count, 10);
  const completionRate = activeCount > 0 ? Math.round((totalAttempts / activeCount) * 100) : 0;

  // Calculate weak areas based on question performance by content
  let weakAreas: string[] = [];
  if (totalAttempts > 0) {
    const weakAreasRes = await query(
      `SELECT c.title, AVG(qa.is_correct::int) as accuracy
       FROM quiz_answers qa
       JOIN quiz_sessions qs ON qa.session_id = qs.id
       JOIN questions q ON qa.question_id = q.id
       LEFT JOIN content c ON q.source_content_id = c.id
       WHERE qs.user_id = $1 AND qs.status = 'completed'
       GROUP BY c.title
       HAVING COUNT(*) >= 3
       ORDER BY accuracy ASC
       LIMIT 3`,
      [userId]
    );
    weakAreas = weakAreasRes.rows
      .filter((row) => row.accuracy < 0.7)
      .map((row) => row.title || "General");
  }

  // Get recent trend (last 10 completed sessions with scores)
  const recentTrendRes = await query(
    `SELECT score, finished_at
     FROM quiz_sessions
     WHERE user_id = $1 AND status = 'completed'
     ORDER BY finished_at DESC
     LIMIT 10`,
    [userId]
  );
  const recentTrend = recentTrendRes.rows.reverse().map((row) => ({
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
