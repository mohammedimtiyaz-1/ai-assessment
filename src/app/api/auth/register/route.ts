import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query } from "@/lib/db";
import { logger } from "@/lib/logger";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  const limit = rateLimit(`register:${ip}`, 5, 60000);
  if (!limit.allowed) {
    return rateLimitResponse(limit.retryAfter ?? 60);
  }

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { email, password, name } = parsed.data;
    const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 10);
    await query(
      "INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)",
      [randomUUID(), email, hash, name || null, "student"]
    );

    logger.info({ email }, "User registered");
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    logger.error(err, "Registration error");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
