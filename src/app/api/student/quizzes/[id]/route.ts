import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { supabase, getSupabaseAdmin } from "@/lib/db";
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

    const supabaseAdmin = getSupabaseAdmin();

    // Fetch quiz configuration
    const { data: quizConfig, error } = await supabaseAdmin
      .from('quiz_configurations')
      .select('*, content!inner(title, type, owner_user_id)')
      .eq('id', id)
      .eq('content.owner_user_id', user.id)
      .single();

    if (error || !quizConfig) {
      logger.error({ error, id, userId: user.id }, "Quiz configuration not found");
      return NextResponse.json({ error: "Quiz configuration not found" }, { status: 404 });
    }

    logger.info({ quizConfigId: id, userId: user.id }, "Quiz configuration fetched");

    return NextResponse.json({
      quizConfig: {
        id: (quizConfig as any).id,
        content_id: (quizConfig as any).content_id,
        content_title: ((quizConfig as any).content as any)?.title,
        content_type: ((quizConfig as any).content as any)?.type,
        difficulty: (quizConfig as any).difficulty,
        question_type: (quizConfig as any).question_type,
        question_count: (quizConfig as any).question_count,
        question_ids: (quizConfig as any).question_ids,
        generated_at: (quizConfig as any).generated_at,
      },
    });

  } catch (error) {
    logger.error({ error }, "Error fetching quiz configuration");
    return NextResponse.json({ error: "Failed to fetch quiz configuration" }, { status: 500 });
  }
});
