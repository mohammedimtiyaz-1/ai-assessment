import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { supabase } from "@/lib/db";

export const POST = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 2]; // Get the id before "close"

  const { data: result, error } = await (supabase.from('assessments') as any)
    .update({ status: 'closed' })
    .eq('id', id)
    .eq('owner_user_id', user.id)
    .select()
    .single();

  if (error || !result) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, assessment: result });
});
