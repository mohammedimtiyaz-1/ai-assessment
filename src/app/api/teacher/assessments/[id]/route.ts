import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

export const GET = auth(async (req) => {
  if (!req.auth?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = req.auth.user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 1];

  const assessRes = await query(
    "SELECT id, title, description, config_json, status, created_at FROM assessments WHERE id = $1 AND owner_user_id = $2",
    [id, req.auth.user.id]
  );
  if (assessRes.rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const linksRes = await query(
    "SELECT token, active FROM assessment_links WHERE assessment_id = $1",
    [id]
  );

  return NextResponse.json({
    ...assessRes.rows[0],
    links: linksRes.rows,
  });
});
