import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { query } from "@/lib/db";

export const GET = withAuth(async (req: NextRequest, user) => {
  const userId = user.id;

  const result = await query(
    `SELECT s.id, COALESCE(a.title, 'Practice') as assessment_title, s.score, s.finished_at, s.status
     FROM quiz_sessions s
     LEFT JOIN assessments a ON s.assessment_id = a.id
     WHERE s.user_id = $1
     ORDER BY s.created_at DESC`,
    [userId]
  );

  return NextResponse.json({ attempts: result.rows });
});
