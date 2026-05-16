import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export const GET = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await query(
    "SELECT id, title, type, created_at FROM content WHERE owner_user_id = $1 ORDER BY created_at DESC",
    [user.id]
  );
  return NextResponse.json({ content: result.rows });
});
