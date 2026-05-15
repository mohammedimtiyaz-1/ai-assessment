import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

export const GET = auth(async (req) => {
  if (!req.auth?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = req.auth.user.id;
  const role = req.auth.user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assessmentsRes = await query(
    "SELECT id, title, status, created_at FROM assessments WHERE owner_user_id = $1 ORDER BY created_at DESC LIMIT 10",
    [userId]
  );

  const countRes = await query(
    "SELECT COUNT(*) as count FROM assessments WHERE owner_user_id = $1",
    [userId]
  );

  const publishedRes = await query(
    "SELECT COUNT(*) as count FROM assessments WHERE owner_user_id = $1 AND status = 'published'",
    [userId]
  );

  const attemptsRes = await query(
    `SELECT COUNT(*) as count FROM quiz_sessions s
     JOIN assessments a ON s.assessment_id = a.id
     WHERE a.owner_user_id = $1`,
    [userId]
  );

  return NextResponse.json({
    assessmentCount: parseInt(countRes.rows[0].count, 10),
    publishedCount: parseInt(publishedRes.rows[0].count, 10),
    totalAttempts: parseInt(attemptsRes.rows[0].count, 10),
    recentAssessments: assessmentsRes.rows,
  });
});
