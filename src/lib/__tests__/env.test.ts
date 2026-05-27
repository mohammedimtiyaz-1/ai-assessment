import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { z } from "zod";

// Mock the env module to test validation logic
const envSchema = z.object({
  DATABASE_URL: z.string().optional().default(""),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  OPENAI_API_KEY: z.string().min(1).optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional().or(z.literal("")),
});

describe("Environment Variables", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should parse valid environment variables", () => {
    const validEnv = {
      DATABASE_URL: "postgresql://localhost/test",
      NEXTAUTH_URL: "http://localhost:3000",
      NEXTAUTH_SECRET: "a".repeat(32),
      OPENAI_API_KEY: "sk-test",
      LOG_LEVEL: "info",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    };

    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DATABASE_URL).toBe("postgresql://localhost/test");
      expect(result.data.NEXTAUTH_URL).toBe("http://localhost:3000");
      expect(result.data.NEXTAUTH_SECRET).toBe("a".repeat(32));
      expect(result.data.OPENAI_API_KEY).toBe("sk-test");
      expect(result.data.LOG_LEVEL).toBe("info");
    }
  });

  it("should use default values for optional fields", () => {
    const validEnv = {
      DATABASE_URL: "postgresql://localhost/test",
      NEXTAUTH_URL: "http://localhost:3000",
      NEXTAUTH_SECRET: "a".repeat(32),
      OPENAI_API_KEY: "sk-test", // Required field
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    };

    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe("development");
      expect(result.data.LOG_LEVEL).toBe("info");
    }
  });

  it("should allow missing DATABASE_URL for app runtime", () => {
    const validEnv = {
      NEXTAUTH_URL: "http://localhost:3000",
      NEXTAUTH_SECRET: "a".repeat(32),
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    };

    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DATABASE_URL).toBe("");
    }
  });

  it("should validate NEXTAUTH_SECRET minimum length", () => {
    const invalidEnv = {
      DATABASE_URL: "postgresql://localhost/test",
      NEXTAUTH_URL: "http://localhost:3000",
      NEXTAUTH_SECRET: "short",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    };

    const result = envSchema.safeParse(invalidEnv);
    expect(result.success).toBe(false);
  });

  it("should validate NEXTAUTH_URL format", () => {
    const invalidEnv = {
      DATABASE_URL: "postgresql://localhost/test",
      NEXTAUTH_URL: "not-a-url",
      NEXTAUTH_SECRET: "a".repeat(32),
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    };

    const result = envSchema.safeParse(invalidEnv);
    expect(result.success).toBe(false);
  });

  it("should validate LOG_LEVEL enum", () => {
    const invalidEnv = {
      DATABASE_URL: "postgresql://localhost/test",
      NEXTAUTH_URL: "http://localhost:3000",
      NEXTAUTH_SECRET: "a".repeat(32),
      LOG_LEVEL: "invalid",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    };

    const result = envSchema.safeParse(invalidEnv);
    expect(result.success).toBe(false);
  });
});
