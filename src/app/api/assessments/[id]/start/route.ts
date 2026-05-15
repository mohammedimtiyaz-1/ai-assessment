import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";

export const POST = auth(async (req) => {
  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 2];
  if (!id) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { token, name, accessCode } = body;

  const linkRes = await query(
    `SELECT l.*, a.config_json, a.status as assessment_status
     FROM assessment_links l
     JOIN assessments a ON l.assessment_id = a.id
     WHERE l.token = $1 AND l.assessment_id = $2`,
    [token, id]
  );
  if (linkRes.rows.length === 0) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  const link = linkRes.rows[0];
  const now = new Date();
  if (!link.active || (link.expiry_at && new Date(link.expiry_at) < now)) {
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  const config = link.config_json || {};

  if (link.require_login && !req.auth?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  if (!link.require_login && !req.auth?.user && (!name || name.trim().length === 0)) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (link.access_code_hash && accessCode) {
    const valid = await bcrypt.compare(accessCode, link.access_code_hash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid access code" }, { status: 403 });
    }
  } else if (link.access_code_hash && !accessCode) {
    return NextResponse.json({ error: "Access code required" }, { status: 403 });
  }

  if (config.availability?.startAt && new Date(config.availability.startAt) > now) {
    return NextResponse.json({ error: "Assessment not yet available" }, { status: 403 });
  }
  if (config.availability?.endAt && new Date(config.availability.endAt) < now) {
    return NextResponse.json({ error: "Assessment closed" }, { status: 403 });
  }

  if (config.allowedAttempts && req.auth?.user?.id) {
    const attemptRes = await query(
      "SELECT COUNT(*) as count FROM quiz_sessions WHERE user_id = $1 AND assessment_id = $2 AND status = 'completed'",
      [req.auth.user.id, id]
    );
    if (parseInt(attemptRes.rows[0].count, 10) >= config.allowedAttempts) {
      return NextResponse.json({ error: "Attempts exhausted" }, { status: 403 });
    }
  }

  const aqRes = await query(
    "SELECT question_id FROM assessment_questions WHERE assessment_id = $1 ORDER BY position",
    [id]
  );
  const questionIds = aqRes.rows.map((r: any) => r.question_id);
  if (questionIds.length === 0) {
    return NextResponse.json({ error: "No questions available" }, { status: 400 });
  }

  const sessionId = randomUUID();
  await query(
    `INSERT INTO quiz_sessions (id, user_id, guest_name, assessment_id, constraints_json, question_ids, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
    [sessionId, req.auth?.user?.id || null, name || null, id, JSON.stringify(config), questionIds]
  );

  return NextResponse.json({ sessionId });
});
