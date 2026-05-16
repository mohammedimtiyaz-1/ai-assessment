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

// Mock OpenAI - define mock inside factory to avoid hoisting issues
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
    __mockCreate: mockCreate, // Export for access in tests
  };
});

describe("AI Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const OpenAI = require("openai");
    if (OpenAI.__mockCreate) {
      OpenAI.__mockCreate.mockClear();
    }
  });

  describe("generateQuestions", () => {
    it("should parse valid AI response and return questions", async () => {
      const OpenAI = require("openai");
      const mockCreate = OpenAI.__mockCreate;
      
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                questions: [
                  {
                    id: "q1",
                    text: "What is the capital of France?",
                    options: ["London", "Paris", "Berlin", "Madrid"],
                    correctAnswer: 1,
                  },
                ],
              }),
            },
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      const questions = await generateQuestions("Test content", 5);

      expect(questions).toHaveLength(1);
      expect(questions[0].text).toBe("What is the capital of France?");
        difficulty: "easy",
      });
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

      const result = await generateQuestions("Test content", 1);

      expect(result).toEqual([]);
    });

    it("should handle invalid JSON response gracefully", async () => {
      const OpenAI = require("openai");
      const mockCreate = OpenAI.__mockCreate;
      
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

      await expect(generateQuestions("Test content", 5)).rejects.toThrow();
    });

    it("should handle API errors gracefully", async () => {
      const OpenAI = require("openai");
      const mockCreate = OpenAI.__mockCreate;
      
      mockCreate.mockRejectedValue(new Error("API Error"));

      await expect(generateQuestions("Test content", 5)).rejects.toThrow("API Error");
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

      const OpenAI = require("openai");
      const mockCreate = OpenAI.__mockCreate;
            message: {
              content: "invalid json",
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(generateQuestions("Test content", 1)).rejects.toThrow("Failed to generate questions");
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

      await generateQuestions("Test content", 5);

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
  });
});
