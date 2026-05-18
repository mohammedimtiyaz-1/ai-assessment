import OpenAI from "openai";
import { env } from "./env";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export interface GeneratedQuestion {
  body: string;
  answers: Array<{ key: string; text: string }>;
  correctAnswer: string;
  difficulty: "easy" | "medium" | "hard";
  questionType: "mcq" | "essay" | "fill-blanks" | "match-following" | "riddle";
  // For fill-in-blanks
  blanks?: Array<{ index: number; answer: string }>;
  // For match-following
  pairs?: Array<{ left: string; right: string }>;
  // For riddles
  hint?: string;
}

export interface GenerateQuestionsOptions {
  count?: number;
  difficulty?: "easy" | "medium" | "hard" | "mixed";
  questionType?: "mcq" | "essay" | "fill-blanks" | "match-following" | "riddle" | "mixed";
}

export async function generateQuestions(
  contentText: string,
  options: GenerateQuestionsOptions = {}
): Promise<GeneratedQuestion[]> {
  const questionType = options.questionType || "mcq";

  const count = options.count || 10;
  const difficulty = options.difficulty || "medium";

  try {
    // Build difficulty-specific prompt
    const difficultyPrompt = getDifficultyPrompt(difficulty);

    let systemPrompt = "";
    let userPrompt = "";

    if (questionType === "mcq") {
      systemPrompt = `You are an AI tutor that generates multiple-choice questions from study materials. 
${difficultyPrompt}
Generate ${count} questions based on the provided content.
Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "body": "Question text here",
      "answers": [
        {"key": "A", "text": "Option A"},
        {"key": "B", "text": "Option B"},
        {"key": "C", "text": "Option C"},
        {"key": "D", "text": "Option D"}
      ],
      "correctAnswer": "A",
      "difficulty": "easy|medium|hard"
    }
  ]
}`;

      userPrompt = `Generate ${count} multiple-choice questions from the following content:\n\n${contentText}`;
    } else if (questionType === "essay") {
      systemPrompt = `You are an AI tutor that generates essay questions from study materials.
${difficultyPrompt}
Generate ${count} essay questions based on the provided content.
Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "body": "Essay question text here",
      "answers": [],
      "correctAnswer": "A comprehensive answer outline",
      "difficulty": "easy|medium|hard"
    }
  ]
}`;

      userPrompt = `Generate ${count} essay questions from the following content:\n\n${contentText}`;
    } else if (questionType === "fill-blanks") {
      systemPrompt = `You are an AI tutor that generates fill-in-the-blank questions from study materials.
${difficultyPrompt}
Generate ${count} fill-in-the-blank questions based on the provided content.
Mark blanks with [BLANK] and provide the correct answers.
Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "body": "Question text with [BLANK] markers",
      "answers": [
        {"key": "1", "text": "Answer for first blank"},
        {"key": "2", "text": "Answer for second blank"}
      ],
      "correctAnswer": "1,2",
      "difficulty": "easy|medium|hard"
    }
  ]
}`;

      userPrompt = `Generate ${count} fill-in-the-blank questions from the following content:\n\n${contentText}`;
    } else if (questionType === "match-following") {
      systemPrompt = `You are an AI tutor that generates match-the-following questions from study materials.
${difficultyPrompt}
Generate ${count} match-the-following questions with 4 pairs each based on the provided content.
Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "body": "Match the items from Column A with Column B",
      "answers": [
        {"key": "A", "text": "Item A1"},
        {"key": "B", "text": "Item B1"},
        {"key": "C", "text": "Item A2"},
        {"key": "D", "text": "Item B2"}
      ],
      "correctAnswer": "A-B,C-D",
      "difficulty": "easy|medium|hard"
    }
  ]
}`;

      userPrompt = `Generate ${count} match-the-following questions from the following content:\n\n${contentText}`;
    } else if (questionType === "riddle") {
      systemPrompt = `You are an AI tutor that generates riddles based on study materials.
${difficultyPrompt}
Generate ${count} riddles based on the provided content.
Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "body": "Riddle text here",
      "answers": [
        {"key": "A", "text": "Answer A"},
        {"key": "B", "text": "Answer B"}
      ],
      "correctAnswer": "A",
      "difficulty": "easy|medium|hard"
    }
  ]
}`;

      userPrompt = `Generate ${count} riddles from the following content:\n\n${contentText}`;
    } else if (questionType === "mixed") {
      // For mixed, generate MCQs for now - will be expanded later
      systemPrompt = `You are an AI tutor that generates multiple-choice questions from study materials. 
${difficultyPrompt}
Generate ${count} questions based on the provided content.
Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "body": "Question text here",
      "answers": [
        {"key": "A", "text": "Option A"},
        {"key": "B", "text": "Option B"},
        {"key": "C", "text": "Option C"},
        {"key": "D", "text": "Option D"}
      ],
      "correctAnswer": "A",
      "difficulty": "easy|medium|hard"
    }
  ]
}`;

      userPrompt = `Generate ${count} multiple-choice questions from the following content:\n\n${contentText}`;
    } else {
      throw new Error(`Question type "${questionType}" is not yet supported.`);
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content returned from AI");
    }

    const parsed = JSON.parse(content);
    
    // Add questionType to each question
    const questions = (parsed.questions || []).map((q: GeneratedQuestion) => ({
      ...q,
      questionType: questionType === "mixed" ? "mcq" : questionType,
      difficulty: q.difficulty || difficulty === "mixed" ? "medium" : difficulty,
    }));

    return questions;
  } catch (error) {
    console.error("Error generating questions:", error);
    throw new Error("Failed to generate questions");
  }
}

function getDifficultyPrompt(difficulty: string): string {
  switch (difficulty) {
    case "easy":
      return "Generate easy questions that test basic understanding and recall. Use straightforward language and clear concepts.";
    case "medium":
      return "Generate medium-difficulty questions that test comprehension and application. Include some analysis and reasoning.";
    case "hard":
      return "Generate challenging questions that test deep understanding, synthesis, and critical thinking. Use complex scenarios and require detailed analysis.";
    case "mixed":
      return "Generate a mix of easy, medium, and hard questions to provide a balanced assessment.";
    default:
      return "Generate medium-difficulty questions that test comprehension and application.";
  }
}
