import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

type MockQuery = {
  data: unknown[];
  count: number;
  error: null;
  select: () => MockQuery;
  eq: () => MockQuery;
  order: () => MockQuery;
  limit: () => Promise<{ data: unknown[]; count: number; error: null }>;
};

const createQuery = (data: unknown[] = [], count = data.length) => {
  const query: MockQuery = {
    data,
    count,
    error: null,
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => Promise.resolve({ data, count, error: null })),
  };

  return query;
};

// Mock dependencies
vi.mock("@/lib/api-auth", () => ({
  withAuth: (handler: any) => {
    return async (req: NextRequest) => {
      const mockUser = { id: "user-1", email: "test@example.com", role: "student" };
      return handler(req, mockUser);
    };
  },
}));

const mockSupabaseClient = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  supabase: mockSupabaseClient,
  getSupabaseAdmin: () => mockSupabaseClient,
}));

import { supabase } from "@/lib/db";
import { GET } from "../student/progress/route";

describe("Student Progress API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return progress data for authenticated user", async () => {
    const mockSupabase = vi.mocked(supabase);

    const mockFrom = vi
      .fn()
      .mockReturnValueOnce(createQuery([{ score: 80 }, { score: 100 }], 2))
      .mockReturnValueOnce(createQuery([], 3))
      .mockReturnValueOnce(createQuery([], 0))
      .mockReturnValueOnce(createQuery([{ score: 80, finished_at: "2026-05-24T00:00:00.000Z" }], 1));

    mockSupabase.from = mockFrom;

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
    const mockSupabase = vi.mocked(supabase);

    const mockFrom = vi.fn().mockReturnValue(createQuery());

    mockSupabase.from = mockFrom;

    const req = new NextRequest("http://localhost:3000/api/student/progress");
    const response = await GET(req);
    const data = await response.json();

    expect(data.totalAttempts).toBe(0);
    expect(data.averageScore).toBe(0);
    expect(data.weakAreas).toEqual([]);
    expect(data.recentTrend).toEqual([]);
  });
});
