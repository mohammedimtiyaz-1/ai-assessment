import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export const POST = async (req: NextRequest) => {
  const token = await getSession(req);
  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 2];
  if (!id) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { token: linkToken, name, accessCode } = body;

  console.log("Start API request:", { id, linkToken, name, accessCode, hasToken: !!token?.sub });

  const linkRes = await query(
    `SELECT l.*, a.config_json, a.status as assessment_status
     FROM assessment_links l
     JOIN assessments a ON l.assessment_id = a.id
     WHERE l.token = $1 AND l.assessment_id = $2`,
    [linkToken, id]
  );
  if (linkRes.rows.length === 0) {
    console.log("Invalid token or assessment ID");
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  const link = linkRes.rows[0];
  const now = new Date();
  console.log("Link found:", { active: link.active, expiry_at: link.expiry_at, assessment_status: link.assessment_status, hasAccessCode: !!link.access_code_hash });

  if (!link.active || (link.expiry_at && new Date(link.expiry_at) < now)) {
    console.log("Link expired");
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  // Check if assessment is closed
  if (link.assessment_status === "closed") {
    console.log("Assessment is closed");
    return NextResponse.json({ error: "Assessment is closed and no longer accepting new participants" }, { status: 403 });
  }

  const config = link.config_json || {};
  console.log("Config:", { require_login: link.require_login, hasAccessCode: !!link.access_code_hash, availability: config.availability });

  if (link.require_login && !token?.sub) {
    console.log("Login required");
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  if (!link.require_login && !token?.sub && (!name || name.trim().length === 0)) {
    console.log("Name is required");
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (link.access_code_hash && accessCode) {
    const valid = await bcrypt.compare(accessCode, link.access_code_hash);
    console.log("Access code validation:", { valid, providedCode: accessCode });
    if (!valid) {
      return NextResponse.json({ error: "Invalid access code" }, { status: 403 });
    }
  } else if (link.access_code_hash && !accessCode) {
    console.log("Access code required but not provided");
    return NextResponse.json({ error: "Access code required" }, { status: 403 });
  }

  if (config.availability?.startAt && new Date(config.availability.startAt) > now) {
    console.log("Assessment not yet available, startAt:", config.availability.startAt);
    return NextResponse.json({ error: "Assessment not yet available" }, { status: 403 });
  }
  if (config.availability?.endAt && new Date(config.availability.endAt) < now) {
    console.log("Assessment closed, endAt:", config.availability.endAt);
    return NextResponse.json({ error: "Assessment closed" }, { status: 403 });
  }

  if (config.allowedAttempts && token?.sub) {
    const attemptRes = await query(
      "SELECT COUNT(*) as count FROM quiz_sessions WHERE user_id = $1 AND assessment_id = $2 AND status = 'completed'",
      [token.sub, id]
    );
    const attemptCount = parseInt(attemptRes.rows[0].count, 10);
    console.log("Attempt check:", { attemptCount, allowedAttempts: config.allowedAttempts });
    if (attemptCount >= config.allowedAttempts) {
      return NextResponse.json({ error: "Attempts exhausted" }, { status: 403 });
    }
  }

  const aqRes = await query(
    "SELECT question_id FROM assessment_questions WHERE assessment_id = $1 ORDER BY position",
    [id]
  );
  const questionIds = aqRes.rows.map((r: any) => r.question_id);
  if (questionIds.length === 0) {
    console.log("No questions available");
    return NextResponse.json({ error: "No questions available" }, { status: 400 });
  }

  const sessionId = randomUUID();
  await query(
    `INSERT INTO quiz_sessions (id, user_id, guest_name, assessment_id, constraints_json, question_ids, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
    [sessionId, token?.sub || null, name || null, id, JSON.stringify(config), questionIds]
  );

  console.log("Session created successfully:", { sessionId });
  return NextResponse.json({ sessionId });
};
