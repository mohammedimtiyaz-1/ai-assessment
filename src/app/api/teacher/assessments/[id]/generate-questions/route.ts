import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { query } from "@/lib/db";
import { generateQuestions } from "@/lib/ai";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export const POST = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 2];

  // Verify ownership
  const assessmentCheck = await query(
    "SELECT id FROM assessments WHERE id = $1 AND owner_user_id = $2",
    [id, user.id]
  );
  if (assessmentCheck.rows.length === 0) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  // Fetch linked content
  const linkedContentRes = await query(
    `SELECT c.id, c.title, c.type, c.storage_ref 
     FROM assessment_content ac
     JOIN content c ON ac.content_id = c.id
     WHERE ac.assessment_id = $1`,
    [id]
  );

  if (linkedContentRes.rows.length === 0) {
    return NextResponse.json({ error: "No content attached to this assessment" }, { status: 400 });
  }

  // Generate questions from each attached content
  let totalQuestionsGenerated = 0;
  for (const content of linkedContentRes.rows) {
    try {
      let contentText = "";
      
      // Extract content text based on type
      if (content.type === "text") {
        contentText = content.storage_ref || "";
      } else {
        // For file types, storage_ref might be a path - for now, we'll use the title as fallback
        // In a real implementation, you'd read the file from storage
        contentText = content.title;
      }

      if (!contentText.trim()) {
        continue;
      }

      // Generate questions using AI
      const questions = await generateQuestions(contentText, 5); // 5 questions per content
      
      // Store questions and link to assessment
      for (const q of questions) {
        const questionId = randomUUID();
        
        // Insert question
        await query(
          `INSERT INTO questions (id, source_content_id, body, answers_json, correct_answer_key, difficulty)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [questionId, content.id, q.body, JSON.stringify(q.answers), q.correctAnswer, q.difficulty || "medium"]
        );

        // Link question to assessment
        await query(
          `INSERT INTO assessment_questions (assessment_id, question_id, position)
           VALUES ($1, $2, $3)`,
          [id, questionId, totalQuestionsGenerated]
        );

        totalQuestionsGenerated++;
      }
    } catch (error) {
      console.error(`Failed to generate questions for content ${content.id}:`, error);
    }
  }

  // Update assessment status to published if questions were generated
  if (totalQuestionsGenerated > 0) {
    await query(
      "UPDATE assessments SET status = 'published' WHERE id = $1",
      [id]
    );
  }

  return NextResponse.json({ success: true, questionsGenerated: totalQuestionsGenerated });
});
