import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { supabase, getSupabaseAdmin, SupabaseConfigError } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
  role: z.enum(["student", "teacher"]).default("student"),
});

function isDuplicateUserError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message).toLowerCase() : "";
  return code === "23505" || message.includes("user already exists") || message.includes("duplicate");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, role } = schema.parse(body);
    const normalizedEmail = email.toLowerCase().trim();

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: newUser, error: insertError } = env.SUPABASE_SERVICE_ROLE_KEY
      ? await getSupabaseAdmin()
          .from("users")
          .insert({
            email: normalizedEmail,
            password_hash: hashedPassword,
            name: name || normalizedEmail.split("@")[0],
            role,
          } as any)
          .select("id")
          .single()
      : await supabase
          .rpc("register_user" as any, {
            p_email: normalizedEmail,
            p_password_hash: hashedPassword,
            p_name: name || normalizedEmail.split("@")[0],
            p_role: role,
          } as any)
          .single();

    if (insertError) {
      if (isDuplicateUserError(insertError)) {
        return NextResponse.json({ error: "User already exists" }, { status: 400 });
      }

      logger.error({ error: insertError }, "Error inserting user");
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    const userId = (newUser as any)?.id;
    logger.info({ userId, email: normalizedEmail, role }, "User registered successfully");

    return NextResponse.json(
      { message: "User registered successfully", userId },
      { status: 201 }
    );
  } catch (err: any) {
    if (err instanceof SupabaseConfigError) {
      logger.error({ error: err.message }, "Registration disabled due to configuration error");
      return NextResponse.json({ error: "Registration temporarily unavailable" }, { status: 503 });
    }

    logger.error({ 
      error: err.message, 
      stack: err.stack
    }, "Registration error");
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
