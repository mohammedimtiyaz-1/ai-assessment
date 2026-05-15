import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";
import { randomUUID } from "crypto";

const createSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
});

export const GET = auth(async (req) => {
  if (!req.auth?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = req.auth.user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await query(
    "SELECT id, title, status, created_at FROM assessments WHERE owner_user_id = $1 ORDER BY created_at DESC",
    [req.auth.user.id]
  );
  return NextResponse.json({ assessments: result.rows });
});

export const POST = auth(async (req) => {
  if (!req.auth?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = req.auth.user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { title, description } = parsed.data;
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

  await query(
    "INSERT INTO assessments (id, owner_user_id, title, description, config_json, status) VALUES ($1, $2, $3, $4, $5, $6)",
    [id, req.auth.user.id, title, description || null, JSON.stringify(defaultConfig), "draft"]
  );

  return NextResponse.json({ id, title, status: "draft" }, { status: 201 });
});
