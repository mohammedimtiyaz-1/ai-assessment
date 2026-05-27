import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { supabase } from "@/lib/db";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export const POST = async (req: NextRequest) => {
  const token = await getSession(req);
  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 2];
  if (!id) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { token: linkToken, name, accessCode } = body;

  logger.info({ id, linkToken, name, accessCode, hasToken: !!token?.sub }, "Start API request");

  const { data: linkData } = await supabase
    .from('assessment_links')
    .select('*, assessments!inner(config_json, status)')
    .eq('token', linkToken)
    .eq('assessment_id', id)
    .single();
  
  if (!linkData) {
    logger.warn({ linkToken, id }, "Invalid token or assessment ID");
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  const link = linkData as any;
  const assessment = link.assessments;
  const now = new Date();
  logger.info({ active: link.active, expiry_at: link.expiry_at, assessment_status: assessment.status, hasAccessCode: !!link.access_code_hash }, "Link found");

  if (!link.active || (link.expiry_at && new Date(link.expiry_at) < now)) {
    logger.warn("Link expired");
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  // Check if assessment is closed
  if (assessment.status === "closed") {
    logger.warn("Assessment is closed");
    return NextResponse.json({ error: "Assessment is closed and no longer accepting new participants" }, { status: 403 });
  }

  const config = assessment.config_json || {};
  logger.info({ require_login: link.require_login, hasAccessCode: !!link.access_code_hash, availability: config.availability }, "Config");

  if (link.require_login && !token?.sub) {
    logger.warn("Login required");
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  if (!link.require_login && !token?.sub && (!name || name.trim().length === 0)) {
    logger.warn("Name is required");
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (link.access_code_hash && accessCode) {
    const valid = await bcrypt.compare(accessCode, link.access_code_hash);
    logger.info({ valid, providedCode: accessCode }, "Access code validation");
    if (!valid) {
      return NextResponse.json({ error: "Invalid access code" }, { status: 403 });
    }
  } else if (link.access_code_hash && !accessCode) {
    logger.warn("Access code required but not provided");
    return NextResponse.json({ error: "Access code required" }, { status: 403 });
  }

  if (config.availability?.startAt && new Date(config.availability.startAt) > now) {
    logger.warn({ startAt: config.availability.startAt }, "Assessment not yet available");
    return NextResponse.json({ error: "Assessment not yet available" }, { status: 403 });
  }
  if (config.availability?.endAt && new Date(config.availability.endAt) < now) {
    logger.warn({ endAt: config.availability.endAt }, "Assessment closed");
    return NextResponse.json({ error: "Assessment closed" }, { status: 403 });
  }

  if (config.allowedAttempts && token?.sub) {
    const { count } = await supabase
      .from('quiz_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', token.sub)
      .eq('assessment_id', id)
      .eq('status', 'completed');
    
    const attemptCount = count || 0;
    logger.info({ attemptCount, allowedAttempts: config.allowedAttempts }, "Attempt check");
    if (attemptCount >= config.allowedAttempts) {
      return NextResponse.json({ error: "Attempts exhausted" }, { status: 403 });
    }
  }

  const { data: aqData } = await supabase
    .from('assessment_questions')
    .select('question_id')
    .eq('assessment_id', id)
    .order('position', { ascending: true });
  
  const questionIds = (aqData || []).map((r: any) => r.question_id);
  if (questionIds.length === 0) {
    logger.warn("No questions available");
    return NextResponse.json({ error: "No questions available" }, { status: 400 });
  }

  const sessionId = randomUUID();
  const { error: insertError } = await supabase
    .from('quiz_sessions')
    .insert({
      id: sessionId,
      user_id: token?.sub || null,
      guest_name: name || null,
      assessment_id: id,
      constraints_json: config as any,
      question_ids: questionIds,
      status: 'active'
    } as any);

  if (insertError) {
    logger.error({ error: insertError }, "Failed to create session");
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }

  logger.info({ sessionId }, "Session created successfully");
  return NextResponse.json({ sessionId });
};
