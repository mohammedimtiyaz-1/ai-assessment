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
    const assessmentsRes = await query(
      "SELECT id, title, description, status, created_at FROM assessments WHERE status = 'published' ORDER BY created_at DESC LIMIT 10"
    );
    const sessionsRes = await query(
      "SELECT id, assessment_id, score, status, started_at, finished_at FROM quiz_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5",
      [user.id]
    );
    const contentRes = await query(
      "SELECT id, title, type, created_at FROM content WHERE owner_user_id = $1 ORDER BY created_at DESC LIMIT 5",
      [user.id]
    );

    return NextResponse.json({
      assessments: assessmentsRes.rows,
      recentSessions: sessionsRes.rows,
      recentContent: contentRes.rows,
    });
  } catch (err) {
    logger.error({ userId: user.id, error: err }, "Dashboard API error");
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
});
