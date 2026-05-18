import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const linkRes = await query(
    `SELECT l.*, a.id as assessment_id, a.title, a.description, a.config_json, a.status
     FROM assessment_links l
     JOIN assessments a ON l.assessment_id = a.id
     WHERE l.token = $1`,
    [token]
  );

  if (linkRes.rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const link = linkRes.rows[0];
  const now = new Date();
  if (!link.active || (link.expiry_at && new Date(link.expiry_at) < now)) {
    return NextResponse.json({ error: "Link expired or inactive" }, { status: 410 });
  }

  return NextResponse.json({
    id: link.assessment_id,
    title: link.title,
    description: link.description,
    config: link.config_json || {},
    requireLogin: link.require_login,
    hasAccessCode: !!link.access_code_hash,
    status: link.status,
  });
}
