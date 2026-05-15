import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { randomUUID } from "crypto";

export const GET = auth(async (req) => {
  if (!req.auth?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = req.auth.user.id;
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

export const POST = auth(async (req) => {
  if (!req.auth?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = req.auth.user.id;

  const formData = await req.formData();
  const title = formData.get("title") as string;
  const file = formData.get("file") as File | null;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const type = file?.name?.split(".").pop()?.toLowerCase() || "text";
  const storageRef = file ? `uploads/${userId}/${Date.now()}_${file.name}` : null;

  await query(
    "INSERT INTO content (id, owner_user_id, title, type, storage_ref) VALUES ($1, $2, $3, $4, $5)",
    [randomUUID(), userId, title, type, storageRef]
  );

  return NextResponse.json({ success: true }, { status: 201 });
});
