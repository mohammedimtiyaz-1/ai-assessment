import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { supabase } from "@/lib/db";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export const GET = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 2];

  const { data } = await supabase
    .from('assessment_content')
    .select('content!inner(id, title, type)')
    .eq('assessment_id', id);
  
  return NextResponse.json({ linkedContent: (data || []).map((item: any) => item.content) });
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 2];
  const body = await req.json().catch(() => ({}));
  const { contentId } = body;

  if (!contentId) {
    return NextResponse.json({ error: "Content ID required" }, { status: 400 });
  }

  // Verify ownership
  const { data: assessmentCheck } = await supabase
    .from('assessments')
    .select('id')
    .eq('id', id)
    .eq('owner_user_id', user.id)
    .single();
  
  if (!assessmentCheck) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  const { data: contentCheck } = await supabase
    .from('content')
    .select('id')
    .eq('id', contentId)
    .eq('owner_user_id', user.id)
    .single();
  
  if (!contentCheck) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from('assessment_content')
    .insert({
      id: randomUUID(),
      assessment_id: id,
      content_id: contentId
    } as any);

  if (error) {
    return NextResponse.json({ error: "Failed to link content" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
});
