import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/db";
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

  logger.info({ userId: user.id, userEmail: user.email, userRole: user.role }, "Fetching teacher assessments");

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('assessments')
    .select('id, title, description, status, created_at')
    .eq('owner_user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch assessments" }, { status: 500 });
  }

  logger.info({ userId: user.id, count: data?.length }, "Teacher assessments fetched");

  return NextResponse.json({ assessments: data || [] });
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: userCheck, error: userCheckError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (userCheckError || !userCheck) {
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

    const { error: insertError } = await supabaseAdmin
      .from('assessments')
      .insert({
        id,
        owner_user_id: user.id,
        title,
        description: description || null,
        ai_note: aiNote || null,
        config_json: finalConfig as any,
        status: "created"
      } as any);

    if (insertError) {
      logger.error({ error: insertError }, "Failed to create assessment");
      return NextResponse.json({ error: "Failed to create assessment", details: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ id, title, status: "created" }, { status: 201 });
  } catch (error: any) {
    logger.error({ error }, "Error creating assessment");
    return NextResponse.json({ error: "Failed to create assessment", details: error.message }, { status: 500 });
  }
});
