import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { supabase, getSupabaseAdmin } from "@/lib/db";
import { generateQuestions } from "@/lib/ai";
import { z } from "zod";
import { logger } from "@/lib/logger";

const GenerateQuizSchema = z.object({
  contentId: z.string().uuid(),
  difficulty: z.enum(["easy", "medium", "hard", "mixed"]).default("medium"),
  questionCount: z.number().int().min(1).max(20).default(5),
  questionType: z.enum(["mcq", "essay", "fill-blanks", "match-following", "riddle", "mixed"]).default("mcq"),
});

export const runtime = "nodejs";

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { contentId, difficulty, questionCount, questionType } = GenerateQuizSchema.parse(body);

    logger.info({ userId: user.id, contentId, difficulty, questionCount, questionType }, "Generating quiz");

    const supabaseAdmin = getSupabaseAdmin();

    // Fetch content
    const { data: content, error: contentError } = await supabaseAdmin
      .from('content')
      .select('title, type, storage_ref')
      .eq('id', contentId)
      .eq('owner_user_id', user.id)
      .single();

    if (contentError || !content) {
      logger.error({ contentError, contentId, userId: user.id }, "Content not found in database");
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    // Get text content from storage_ref (which contains the actual text for text uploads)
    let textContent = "";
    if ((content as any).storage_ref && typeof (content as any).storage_ref === "string") {
      textContent = (content as any).storage_ref;
    }

    if (!textContent || !textContent.trim()) {
      logger.warn({ contentId }, "No text content available for quiz generation");
      return NextResponse.json({ 
        error: "No text content available for quiz generation. Please upload content with text." 
      }, { status: 400 });
    }

    // Generate questions using AI
    const questions = await generateQuestions(textContent, {
      count: questionCount,
      difficulty,
      questionType,
    });

    if (!questions || questions.length === 0) {
      logger.error({ contentId, userId: user.id }, "No questions generated from content");
      return NextResponse.json({ 
        error: "Failed to generate questions from content. The content might be too short or not suitable for quiz generation." 
      }, { status: 400 });
    }

    // Store questions in database
    const questionIds: string[] = [];
    for (const q of questions) {
      const questionId = crypto.randomUUID();
      const { error: insertError } = await supabaseAdmin
        .from('questions')
        .insert({
          id: questionId,
          source_content_id: contentId,
          body: q.body,
          answers_json: JSON.stringify(q.answers),
          correct_answer_key: q.correctAnswer,
          difficulty: q.difficulty || difficulty === "mixed" ? "medium" : difficulty,
          question_type: q.questionType || questionType === "mixed" ? "mcq" : questionType
        } as any);

      if (insertError) {
        logger.error({ error: insertError }, "Failed to insert question");
      }
      questionIds.push(questionId);
    }

    // Store quiz configuration
    const quizConfigId = crypto.randomUUID();
    const { error: configError } = await supabaseAdmin
      .from('quiz_configurations')
      .insert({
        id: quizConfigId,
        content_id: contentId,
        difficulty,
        question_type: questionType,
        question_count: questionCount,
        question_ids: questionIds
      } as any);

    if (configError) {
      logger.error({ error: configError }, "Failed to insert quiz configuration");
    }

    logger.info({ quizConfigId, contentId, questionCount }, "Quiz configuration created");

    return NextResponse.json({
      quizConfigurationId: quizConfigId,
      questionCount: questions.length,
      difficulty,
      questionType,
    });

  } catch (error) {
    logger.error({ error }, "Error generating quiz");
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request parameters", details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 });
  }
});
