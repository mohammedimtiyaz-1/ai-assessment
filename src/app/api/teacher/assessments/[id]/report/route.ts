import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { query } from "@/lib/db";

export const GET = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 2];

  const assessRes = await query(
    "SELECT title FROM assessments WHERE id = $1 AND owner_user_id = $2",
    [id, user.id]
  );
  if (assessRes.rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const totalRes = await query(
    "SELECT COUNT(*) as count FROM quiz_sessions WHERE assessment_id = $1",
    [id]
  );
  const completedRes = await query(
    "SELECT COUNT(*) as count, COALESCE(AVG(score), 0) as avg FROM quiz_sessions WHERE assessment_id = $1 AND status = 'completed'",
    [id]
  );
  const studentsRes = await query(
    `SELECT COALESCE(u.name, s.guest_name, 'Guest') as name, s.score, s.finished_at
     FROM quiz_sessions s
     LEFT JOIN users u ON s.user_id = u.id
     WHERE s.assessment_id = $1
     ORDER BY s.created_at DESC`,
    [id]
  );

  return NextResponse.json({
    assessmentTitle: assessRes.rows[0].title,
    totalAttempts: parseInt(totalRes.rows[0].count, 10),
    completions: parseInt(completedRes.rows[0].count, 10),
    averageScore: completedRes.rows[0].avg ? Math.round(parseFloat(completedRes.rows[0].avg)) : null,
    studentResults: studentsRes.rows,
  });
});
