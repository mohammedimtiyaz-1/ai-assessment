import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { supabase } from "@/lib/db";

export const runtime = "nodejs";

export const GET = withAuth(async (req: NextRequest, user) => {
  const role = user.role;
  if (!["teacher", "admin", "super_admin"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data } = await supabase
    .from('content')
    .select('id, title, type, created_at')
    .eq('owner_user_id', user.id)
    .order('created_at', { ascending: false });
  
  return NextResponse.json({ content: data || [] });
});
