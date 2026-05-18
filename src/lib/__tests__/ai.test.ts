import { describe, it, expect, beforeEach, vi } from "vitest";
import { generateQuestions } from "../ai";

// Mock env module
vi.mock("../env", () => ({
  env: {
    DATABASE_URL: "postgresql://localhost/test",
    NEXTAUTH_URL: "http://localhost:3000",
    NEXTAUTH_SECRET: "a".repeat(32),
    OPENAI_API_KEY: "sk-test",
    NODE_ENV: "test",
    LOG_LEVEL: "info",
  },
}));

// Mock OpenAI with factory function
vi.mock("openai", () => {
  const mockCreate = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
    __mockCreate: mockCreate,
  };
});

describe("AI Module", () => {
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    const OpenAI = require("openai");
    mockCreate = OpenAI.__mockCreate;
    mockCreate.mockClear();
  });

  describe("generateQuestions", () => {
    it("should parse valid AI response and return questions", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                questions: [
                  {
                    body: "What is the capital of France?",
                    answers: [
                      { key: "A", text: "London" },
                      { key: "B", text: "Paris" },
                      { key: "C", text: "Berlin" },
                      { key: "D", text: "Madrid" }
                    ],
                    correctAnswer: "B",
                    difficulty: "easy"
                  },
                ],
              }),
            },
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      const questions = await generateQuestions("Test content", { count: 5 });

      expect(questions).toHaveLength(1);
      expect(questions[0].body).toBe("What is the capital of France?");
      expect(questions[0].difficulty).toBe("easy");
      expect(questions[0].questionType).toBe("mcq");
    });

    it("should return empty array when AI returns no questions", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({ questions: [] }),
            },
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      const result = await generateQuestions("Test content", { count: 1 });

      expect(result).toEqual([]);
    });

    it("should handle invalid JSON response gracefully", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: "invalid json",
            },
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      await expect(generateQuestions("Test content", { count: 5 })).rejects.toThrow();
    });

    it("should handle API errors gracefully", async () => {
      mockCreate.mockRejectedValue(new Error("API Error"));

      await expect(generateQuestions("Test content", { count: 5 })).rejects.toThrow("Failed to generate questions");
    });

    it("should throw error when AI returns no content", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      await expect(generateQuestions("Test content", { count: 1 })).rejects.toThrow("Failed to generate questions");
    });

    it("should use default count of 10 when not specified", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({ questions: [] }),
            },
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      await generateQuestions("Test content");

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "system",
              content: expect.stringContaining("Generate 10 questions"),
            }),
          ]),
        })
      );
    });

    it("should pass custom count to AI prompt", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({ questions: [] }),
            },
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      await generateQuestions("Test content", { count: 5 });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "system",
              content: expect.stringContaining("Generate 5 questions"),
            }),
            expect.objectContaining({
              role: "user",
              content: expect.stringContaining("Generate 5 multiple-choice questions"),
            }),
          ]),
        })
      );
    });

    it("should pass difficulty parameter to AI prompt", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({ questions: [] }),
            },
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      await generateQuestions("Test content", { difficulty: "easy", count: 3 });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "system",
              content: expect.stringContaining("Generate easy questions"),
            }),
          ]),
        })
      );
    });

    it("should throw error for unsupported question types", async () => {
      await expect(generateQuestions("Test content", { questionType: "invalid" as any })).rejects.toThrow("not yet supported");
    });

    it("should generate essay questions", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                questions: [
                  {
                    body: "Explain the process of photosynthesis.",
                    answers: [],
                    correctAnswer: "Photosynthesis is the process by which plants convert light energy into chemical energy.",
                    difficulty: "medium"
                  },
                ],
              }),
            },
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      const questions = await generateQuestions("Test content", { count: 1, questionType: "essay" });

      expect(questions).toHaveLength(1);
      expect(questions[0].questionType).toBe("essay");
    });

    it("should generate fill-in-blanks questions", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                questions: [
                  {
                    body: "Photosynthesis occurs in the [BLANK] of plant cells.",
                    answers: [
                      { key: "1", text: "chloroplast" },
                    ],
                    correctAnswer: "1",
                    difficulty: "easy"
                  },
                ],
              }),
            },
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      const questions = await generateQuestions("Test content", { count: 1, questionType: "fill-blanks" });

      expect(questions).toHaveLength(1);
      expect(questions[0].questionType).toBe("fill-blanks");
    });
  });
});
