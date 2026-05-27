import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { supabase } from "@/lib/db";

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
  const { data: assessmentCheck } = await supabase
    .from('assessments')
    .select('id')
    .eq('id', id)
    .eq('owner_user_id', user.id)
    .single();
  
  if (!assessmentCheck) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from('assessment_content')
    .delete()
    .eq('assessment_id', id)
    .eq('content_id', contentId);

  if (error) {
    return NextResponse.json({ error: "Failed to unlink content" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
});
