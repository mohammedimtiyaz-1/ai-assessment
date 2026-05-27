import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().optional().default(""),
  NEXTAUTH_URL: z.string().url().optional().default("http://localhost:3000"),
  NEXTAUTH_SECRET: z.string().min(32).optional().default(""),
  OPENAI_API_KEY: z.string().min(1).optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional().or(z.literal("")),
});

const resolvedEnv = {
  ...process.env,
  NEXTAUTH_URL:
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
};

// Only parse env on server side to avoid client-side hydration errors
export const env = typeof window === 'undefined' 
  ? envSchema.parse(resolvedEnv)
  : {
      DATABASE_URL: "",
      NEXTAUTH_URL: "http://localhost:3000",
      NEXTAUTH_SECRET: "",
      OPENAI_API_KEY: "",
      NODE_ENV: "development" as const,
      LOG_LEVEL: "info" as const,
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    };
