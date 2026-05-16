import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/api-auth", () => ({
  withAuth: (handler: any) => {
    return async (req: NextRequest) => {
      const mockUser = { id: "user-1", email: "test@example.com", role: "student" };
      return handler(req, mockUser);
    };
  },
}));

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

import { query } from "@/lib/db";
import { GET } from "../student/progress/route";

const createMockQueryResult = (rows: any[]) => ({
  rows,
  command: "SELECT" as const,
  rowCount: rows.length,
  oid: 0,
  fields: [],
});

describe("Student Progress API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return progress data for authenticated user", async () => {
    const mockQuery = vi.mocked(query);
    mockQuery
      .mockResolvedValueOnce(createMockQueryResult([{ count: "5", avg: "75" }]))
      .mockResolvedValueOnce(createMockQueryResult([{ count: "5" }]))
      .mockResolvedValueOnce(createMockQueryResult([{ title: "Biology", accuracy: 0.6 }]))
      .mockResolvedValueOnce(createMockQueryResult([{ score: 80, finished_at: "2026-05-16" }]));

    const req = new NextRequest("http://localhost:3000/api/student/progress");
    const response = await GET(req);
    const data = await response.json();

    expect(data).toHaveProperty("totalAttempts");
    expect(data).toHaveProperty("averageScore");
    expect(data).toHaveProperty("completionRate");
    expect(data).toHaveProperty("weakAreas");
    expect(data).toHaveProperty("recentTrend");
  });

  it("should return empty arrays when no data exists", async () => {
    const mockQuery = vi.mocked(query);
    mockQuery
      .mockResolvedValueOnce(createMockQueryResult([{ count: "0", avg: null }]))
      .mockResolvedValueOnce(createMockQueryResult([{ count: "0" }]))
      .mockResolvedValueOnce(createMockQueryResult([]))
      .mockResolvedValueOnce(createMockQueryResult([]));

    const req = new NextRequest("http://localhost:3000/api/student/progress");
    const response = await GET(req);
    const data = await response.json();

    expect(data.totalAttempts).toBe(0);
    expect(data.averageScore).toBe(0);
    expect(data.weakAreas).toEqual([]);
    expect(data.recentTrend).toEqual([]);
  });

  it("should calculate weak areas based on accuracy threshold", async () => {
    const mockQuery = vi.mocked(query);
    mockQuery
      .mockResolvedValueOnce(createMockQueryResult([{ count: "10", avg: "70" }])) // totalRes
      .mockResolvedValueOnce(createMockQueryResult([{ count: "10" }])) // activeRes
      .mockResolvedValueOnce(
        createMockQueryResult([
          { title: "Physics", accuracy: 0.5 },
          { title: "Chemistry", accuracy: 0.65 },
          { title: "Biology", accuracy: 0.8 },
        ])
      ) // weakAreasRes
      .mockResolvedValueOnce(createMockQueryResult([])); // recentTrendRes

    const req = new NextRequest("http://localhost:3000/api/student/progress");
    const response = await GET(req);
    const data = await response.json();

    expect(data.weakAreas).toContain("Physics");
    expect(data.weakAreas).toContain("Chemistry");
    expect(data.weakAreas).not.toContain("Biology");
  });

  it("should return recent trend in chronological order", async () => {
    const mockQuery = vi.mocked(query);
    mockQuery
      .mockResolvedValueOnce(createMockQueryResult([{ count: "5", avg: "75" }])) // totalRes
      .mockResolvedValueOnce(createMockQueryResult([{ count: "5" }])) // activeRes
      .mockResolvedValueOnce(createMockQueryResult([])) // weakAreasRes (totalAttempts > 0 but no weak areas)
      .mockResolvedValueOnce(
        createMockQueryResult([
          { score: 90, finished_at: "2026-05-16T10:00:00Z" },
          { score: 80, finished_at: "2026-05-15T10:00:00Z" },
          { score: 70, finished_at: "2026-05-14T10:00:00Z" },
        ])
      ); // recentTrendRes

    const req = new NextRequest("http://localhost:3000/api/student/progress");
    const response = await GET(req);
    const data = await response.json();

    expect(data.recentTrend).toHaveLength(3);
    expect(data.recentTrend[0].score).toBe(70); // Oldest first (reversed from DESC order)
    expect(data.recentTrend[2].score).toBe(90); // Newest last
  });
});
