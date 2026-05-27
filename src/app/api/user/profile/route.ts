import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { supabase } from "@/lib/db";

export const GET = withAuth(async (req: NextRequest, user) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role')
    .eq('id', user.id)
    .single();
  
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
});

export const PATCH = withAuth(async (req: NextRequest, user) => {
  const body = await req.json().catch(() => ({}));
  const { name } = body;
  const { error } = await (supabase.from('users') as any)
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', user.id);
  
  if (error) return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  return NextResponse.json({ success: true });
});
