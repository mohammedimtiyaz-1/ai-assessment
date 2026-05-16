import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export const DELETE = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 3];
  const contentId = parts[parts.length - 1];

  // Verify ownership
  const assessmentCheck = await query(
    "SELECT id FROM assessments WHERE id = $1 AND owner_user_id = $2",
    [id, user.id]
  );
  if (assessmentCheck.rows.length === 0) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  await query(
    "DELETE FROM assessment_content WHERE assessment_id = $1 AND content_id = $2",
    [id, contentId]
  );

  return NextResponse.json({ success: true });
});
