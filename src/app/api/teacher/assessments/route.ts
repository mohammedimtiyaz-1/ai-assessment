import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { query } from "@/lib/db";
import { z } from "zod";
import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  aiNote: z.string().optional(),
  config: z.object({
    questionCount: z.number().min(1).max(100).optional(),
    difficulty: z.string().optional(),
    formats: z.array(z.string()).optional(),
    timeLimitSec: z.number().min(60).optional(),
    allowedAttempts: z.number().min(1).optional(),
    resultVisibility: z.string().optional(),
    requireLogin: z.boolean().optional(),
    randomized: z.boolean().optional(),
    sameQuestions: z.boolean().optional(),
  }).optional(),
});

export const GET = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await query(
    "SELECT id, title, description, status, created_at FROM assessments WHERE owner_user_id = $1 ORDER BY created_at DESC",
    [user.id]
  );

  logger.info({ userId: user.id, count: result.rows.length }, "Teacher assessments fetched");

  return NextResponse.json({ assessments: result.rows });
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const userCheck = await query(
      "SELECT id FROM users WHERE id = $1",
      [user.id]
    );

    if (userCheck.rows.length === 0) {
      return NextResponse.json({ error: "User not found. Please log out and log in again." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { title, description, aiNote, config: userConfig } = parsed.data;
    const id = randomUUID();
    const defaultConfig = {
      questionCount: 10,
      difficulty: "mixed",
      formats: ["mcq"],
      timeLimitSec: 900,
      allowedAttempts: 3,
      resultVisibility: "immediate_full",
      requireLogin: true,
      randomized: false,
      sameQuestions: true,
    };

    const finalConfig = userConfig ? { ...defaultConfig, ...userConfig } : defaultConfig;

    await query(
      "INSERT INTO assessments (id, owner_user_id, title, description, ai_note, config_json, status) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [id, user.id, title, description || null, aiNote || null, JSON.stringify(finalConfig), "draft"]
    );

    return NextResponse.json({ id, title, status: "draft" }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating assessment:", error);
    
    if (error.code === '23503') {
      return NextResponse.json({ error: "User not found. Please log out and log in again." }, { status: 400 });
    }
    
    return NextResponse.json({ error: "Failed to create assessment" }, { status: 500 });
  }
});
