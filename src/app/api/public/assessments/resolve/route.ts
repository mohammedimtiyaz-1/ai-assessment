import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const { data: linkData } = await supabase
    .from('assessment_links')
    .select('*, assessments!inner(id, title, description, config_json, status)')
    .eq('token', token)
    .single();

  if (!linkData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const link = linkData as any;
  const assessment = link.assessments;
  const now = new Date();
  if (!link.active || (link.expiry_at && new Date(link.expiry_at) < now)) {
    return NextResponse.json({ error: "Link expired or inactive" }, { status: 410 });
  }

  return NextResponse.json({
    id: assessment.id,
    title: assessment.title,
    description: assessment.description,
    config: assessment.config_json || {},
    requireLogin: link.require_login,
    hasAccessCode: !!link.access_code_hash,
    status: assessment.status,
  });
}
