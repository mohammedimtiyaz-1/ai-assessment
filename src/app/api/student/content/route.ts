import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { query } from "@/lib/db";
import { randomUUID } from "crypto";
import { generateQuestions } from "@/lib/ai";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export const GET = withAuth(async (req: NextRequest, user) => {
  const userId = user.id;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const result = await query(
      "SELECT id, title, type, storage_ref, created_at FROM content WHERE id = $1 AND owner_user_id = $2",
      [id, userId]
    );
    return NextResponse.json({ content: result.rows });
  }

  const result = await query(
    "SELECT id, title, type, storage_ref, created_at FROM content WHERE owner_user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  return NextResponse.json({ content: result.rows });
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const userId = user.id;

  try {
    const userCheck = await query(
      "SELECT id FROM users WHERE id = $1",
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return NextResponse.json({ error: "User not found. Please log out and log in again." }, { status: 400 });
    }

    const formData = await req.formData();
    const title = formData.get("title") as string;
    const uploadType = formData.get("type") as string;
    const file = formData.get("file") as File | null;
    const textContent = formData.get("textContent") as string | null;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const contentId = randomUUID();
    await query(
      "INSERT INTO content (id, owner_user_id, title, type, storage_ref) VALUES ($1, $2, $3, $4, $5)",
      [contentId, user.id, title, uploadType, textContent]
    );

    logger.info({ contentId, userId: user.id, title }, "Content created successfully");

    // Removed automatic question generation - questions will be generated on-demand via the quiz generation API

    return NextResponse.json({
      id: contentId,
      title,
      type: uploadType,
    });
  } catch (error) {
    logger.error({ userId: user.id, error }, "Error creating content");
    return NextResponse.json({ error: "Failed to create content" }, { status: 500 });
  }
});
