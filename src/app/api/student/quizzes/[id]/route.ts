import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { query } from "@/lib/db";
import { logger } from "@/lib/logger";

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    // Extract ID from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];

    if (!id) {
      return NextResponse.json({ error: "Quiz configuration ID is required" }, { status: 400 });
    }

    // Fetch quiz configuration
    const quizConfigRes = await query(
      `SELECT qc.*, c.title as content_title, c.type as content_type
       FROM quiz_configurations qc
       JOIN content c ON qc.content_id = c.id
       WHERE qc.id = $1 AND c.owner_user_id = $2`,
      [id, user.id]
    );

    if (quizConfigRes.rows.length === 0) {
      return NextResponse.json({ error: "Quiz configuration not found" }, { status: 404 });
    }

    const quizConfig = quizConfigRes.rows[0];

    logger.info({ quizConfigId: id, userId: user.id }, "Quiz configuration fetched");

    return NextResponse.json({
      quizConfig: {
        id: quizConfig.id,
        content_id: quizConfig.content_id,
        content_title: quizConfig.content_title,
        content_type: quizConfig.content_type,
        difficulty: quizConfig.difficulty,
        question_type: quizConfig.question_type,
        question_count: quizConfig.question_count,
        question_ids: quizConfig.question_ids,
        generated_at: quizConfig.generated_at,
      },
    });

  } catch (error) {
    logger.error({ error }, "Error fetching quiz configuration");
    return NextResponse.json({ error: "Failed to fetch quiz configuration" }, { status: 500 });
  }
});
