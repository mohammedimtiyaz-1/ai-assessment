import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { supabase } from "@/lib/db";
import { generateQuestions } from "@/lib/ai";
import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export const POST = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 2];

  // Verify ownership
  const { data: assessmentCheck } = await supabase
    .from('assessments')
    .select('id')
    .eq('id', id)
    .eq('owner_user_id', user.id)
    .single();
  
  if (!assessmentCheck) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  // Fetch linked content
  const { data: linkedContent } = await supabase
    .from('assessment_content')
    .select('content!inner(id, title, type, storage_ref)')
    .eq('assessment_id', id);

  if (!linkedContent || linkedContent.length === 0) {
    return NextResponse.json({ error: "No content attached to this assessment" }, { status: 400 });
  }

  // Generate questions from each attached content
  let totalQuestionsGenerated = 0;
  for (const item of linkedContent) {
    const content = (item as any).content;
    try {
      // Use storage_ref for content text - this contains the actual text content
      // For text content, it's the text itself; for files, it's the extracted text
      let contentText = content.storage_ref || "";
      
      // Fallback to title if no storage_ref
      if (!contentText.trim()) {
        contentText = content.title;
      }

      if (!contentText.trim()) {
        logger.warn({ contentId: content.id }, "Skipping content: no text available");
        continue;
      }

      // Generate questions using AI
      const questions = await generateQuestions(contentText, { count: 5 }); // 5 questions per content
      
      // Store questions and link to assessment
      for (const q of questions) {
        const questionId = randomUUID();
        
        // Insert question
        const { error: insertError } = await supabase
          .from('questions')
          .insert({
            id: questionId,
            source_content_id: content.id,
            body: q.body,
            answers_json: JSON.stringify(q.answers),
            correct_answer_key: q.correctAnswer,
            difficulty: q.difficulty || "medium"
          } as any);

        if (insertError) {
          logger.error({ error: insertError }, "Failed to insert question");
        }

        // Link question to assessment
        const { error: linkError } = await supabase
          .from('assessment_questions')
          .insert({
            assessment_id: id,
            question_id: questionId,
            position: totalQuestionsGenerated
          } as any);

        if (linkError) {
          logger.error({ error: linkError }, "Failed to link question to assessment");
        }

        totalQuestionsGenerated++;
      }
    } catch (error) {
      logger.error({ error, contentId: content.id }, "Failed to generate questions for content");
    }
  }

  // Update assessment status to published if questions were generated
  if (totalQuestionsGenerated > 0) {
    const { error: updateError } = await (supabase.from('assessments') as any)
      .update({ status: 'published' })
      .eq('id', id);

    if (updateError) {
      logger.error({ error: updateError }, "Failed to update assessment status");
    }
  }

  return NextResponse.json({ success: true, questionsGenerated: totalQuestionsGenerated });
});
