import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { query } from "@/lib/db";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

function generateToken() {
  return randomUUID().replace(/-/g, "");
}

export const GET = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 2];

  const result = await query(
    "SELECT token, active FROM assessment_links WHERE assessment_id = $1",
    [id]
  );
  return NextResponse.json({ links: result.rows });
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 2];

  const ownership = await query(
    "SELECT id FROM assessments WHERE id = $1 AND owner_user_id = $2",
    [id, user.id]
  );
  if (ownership.rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const token = generateToken();
  await query(
    "INSERT INTO assessment_links (id, assessment_id, token, active) VALUES ($1, $2, $3, true)",
    [randomUUID(), id, token]
  );

  return NextResponse.json({ token });
});
