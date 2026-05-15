import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

export const GET = auth(async (req) => {
  if (!req.auth?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = req.auth.user.id;

  const contentRes = await query("SELECT COUNT(*) as count FROM content WHERE owner_user_id = $1", [userId]);
  const attemptRes = await query(
    "SELECT COUNT(*) as count, COALESCE(AVG(score), 0) as avg FROM quiz_sessions WHERE user_id = $1 AND status = 'completed'",
    [userId]
  );
  const recentContent = await query(
    "SELECT id, title, type FROM content WHERE owner_user_id = $1 ORDER BY created_at DESC LIMIT 5",
    [userId]
  );
  const recentAttempts = await query(
    `SELECT s.id, a.title as assessment_title, s.score, s.finished_at
     FROM quiz_sessions s
     LEFT JOIN assessments a ON s.assessment_id = a.id
     WHERE s.user_id = $1
     ORDER BY s.created_at DESC LIMIT 5`,
    [userId]
  );

  return NextResponse.json({
    contentCount: parseInt(contentRes.rows[0].count, 10),
    attemptCount: parseInt(attemptRes.rows[0].count, 10),
    accuracy: attemptRes.rows[0].avg ? Math.round(parseFloat(attemptRes.rows[0].avg)) : null,
    recentContent: recentContent.rows,
    recentAttempts: recentAttempts.rows,
  });
});
