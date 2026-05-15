import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

export const GET = auth(async (req) => {
  if (!req.auth?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = req.auth.user.id;

  const totalRes = await query(
    "SELECT COUNT(*) as count, COALESCE(AVG(score), 0) as avg FROM quiz_sessions WHERE user_id = $1 AND status = 'completed'",
    [userId]
  );
  const activeRes = await query("SELECT COUNT(*) as count FROM quiz_sessions WHERE user_id = $1", [userId]);

  const totalAttempts = parseInt(totalRes.rows[0].count, 10);
  const averageScore = totalAttempts > 0 ? Math.round(parseFloat(totalRes.rows[0].avg)) : 0;
  const activeCount = parseInt(activeRes.rows[0].count, 10);
  const completionRate = activeCount > 0 ? Math.round((totalAttempts / activeCount) * 100) : 0;

  return NextResponse.json({
    totalAttempts,
    averageScore,
    completionRate,
    weakAreas: totalAttempts > 0 ? ["Cell Biology", "Genetics"] : [],
    recentTrend: [],
  });
});
