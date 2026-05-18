import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { query } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  description: z.string().optional(),
  aiNote: z.string().optional(),
});

export const GET = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 1];

  console.log("Fetching assessment:", { id, userId: user.id, userEmail: user.email, userRole: user.role });

  const result = await query(
    "SELECT * FROM assessments WHERE id = $1 AND owner_user_id = $2",
    [id, user.id]
  );
  
  console.log("Assessment query result:", { rowCount: result.rows.length });
  
  if (result.rows.length === 0) {
    // Check if assessment exists at all (without owner check)
    const checkAny = await query(
      "SELECT id, title, owner_user_id FROM assessments WHERE id = $1",
      [id]
    );
    console.log("Assessment exists check:", checkAny.rows);
    return NextResponse.json({ error: "Not found", debug: { userId: user.id, assessmentId: id, assessmentExists: checkAny.rows.length > 0 } }, { status: 404 });
  }

  const assessment = result.rows[0];

  // Fetch question count
  const questionsRes = await query(
    "SELECT COUNT(*) as count FROM assessment_questions WHERE assessment_id = $1",
    [id]
  );
  const questionCount = parseInt(questionsRes.rows[0].count);

  // Fetch submission count
  const submissionsRes = await query(
    `SELECT COUNT(*) as count FROM quiz_sessions 
     WHERE assessment_id = $1 AND status = 'completed'`,
    [id]
  );
  const submissionCount = parseInt(submissionsRes.rows[0].count);

  // Fetch joined count (students who started but not completed)
  const joinedRes = await query(
    `SELECT COUNT(*) as count FROM quiz_sessions 
     WHERE assessment_id = $1 AND status = 'in_progress'`,
    [id]
  );
  const joinedCount = parseInt(joinedRes.rows[0].count);

  // Fetch linked content
  const linkedContentRes = await query(
    `SELECT c.id, c.title, c.type 
     FROM assessment_content ac
     JOIN content c ON ac.content_id = c.id
     WHERE ac.assessment_id = $1`,
    [id]
  );

  const linksRes = await query(
    "SELECT token, access_code, active FROM assessment_links WHERE assessment_id = $1",
    [id]
  );

  return NextResponse.json({
    ...assessment,
    config: assessment.config_json,
    linkedContent: linkedContentRes.rows,
    links: linksRes.rows,
    questionCount,
    submissionCount,
    joinedCount,
  });
});

export const PATCH = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 1];

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { description, aiNote } = parsed.data;

  await query(
    "UPDATE assessments SET description = COALESCE($1, description), ai_note = COALESCE($2, ai_note) WHERE id = $3 AND owner_user_id = $4",
    [description || null, aiNote || null, id, user.id]
  );

  return NextResponse.json({ success: true });
});
