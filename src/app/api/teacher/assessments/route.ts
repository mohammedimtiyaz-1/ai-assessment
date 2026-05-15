import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

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
