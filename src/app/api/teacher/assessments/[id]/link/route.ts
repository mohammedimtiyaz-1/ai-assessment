import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { supabase } from "@/lib/db";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

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

  const { data } = await supabase
    .from('assessment_links')
    .select('token, active')
    .eq('assessment_id', id);
  
  return NextResponse.json({ links: data || [] });
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 2];

  const { data: ownership } = await supabase
    .from('assessments')
    .select('id, config_json')
    .eq('id', id)
    .eq('owner_user_id', user.id)
    .single();
  
  if (!ownership) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const assessmentConfig = (ownership as any).config_json || {};
  const requireLogin = assessmentConfig.requireLogin ?? true;

  const token = generateToken();
  const accessCode = generateToken().substring(0, 6).toUpperCase();
  const accessCodeHash = await bcrypt.hash(accessCode, 10);
  
  const { error } = await supabase
    .from('assessment_links')
    .insert({
      id: randomUUID(),
      assessment_id: id,
      token,
      access_code_hash: accessCodeHash,
      active: true,
      require_login: requireLogin
    } as any);

  if (error) {
    return NextResponse.json({ error: "Failed to create link" }, { status: 500 });
  }

  return NextResponse.json({ token, accessCode });
});
