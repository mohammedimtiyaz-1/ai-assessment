import OpenAI from "openai";
import { env } from "./env";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export interface GeneratedQuestion {
  body: string;
  answers: { key: string; text: string }[];
  correctAnswer: string;
  difficulty: string;
}

export async function generateQuestions(contentText: string, count: number = 10): Promise<GeneratedQuestion[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI tutor that generates multiple-choice questions from study materials. 
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
}`,
        },
        {
          role: "user",
          content: `Generate ${count} multiple-choice questions from this content:\n\n${contentText}`,
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
    return parsed.questions || [];
  } catch (error) {
    console.error("Error generating questions:", error);
    throw new Error("Failed to generate questions");
  }
}
