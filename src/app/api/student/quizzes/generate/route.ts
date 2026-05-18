import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { query } from "@/lib/db";
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

    // Fetch content
    const contentRes = await query(
      `SELECT title, type, storage_ref FROM content WHERE id = $1 AND owner_user_id = $2`,
      [contentId, user.id]
    );

    if (contentRes.rows.length === 0) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    const content = contentRes.rows[0];

    // Get text content from storage_ref (which contains the actual text for text uploads)
    let textContent = "";
    if (content.storage_ref && typeof content.storage_ref === "string") {
      textContent = content.storage_ref;
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
      await query(
        `INSERT INTO questions (id, source_content_id, body, answers_json, correct_answer_key, difficulty, question_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          questionId,
          contentId,
          q.body,
          JSON.stringify(q.answers),
          q.correctAnswer,
          q.difficulty || difficulty === "mixed" ? "medium" : difficulty,
          q.questionType || questionType === "mixed" ? "mcq" : questionType
        ]
      );
      questionIds.push(questionId);
    }

    // Store quiz configuration
    const quizConfigId = crypto.randomUUID();
    await query(
      `INSERT INTO quiz_configurations (id, content_id, difficulty, question_type, question_count, question_ids)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [quizConfigId, contentId, difficulty, questionType, questionCount, questionIds]
    );

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
