import { NextResponse } from "next/server";

interface Entry {
  count: number;
  reset: number;
}

const store = new Map<string, Entry>();

export function rateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
) {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.reset) {
    store.set(identifier, { count: 1, reset: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= limit) {
    return { allowed: false, retryAfter: Math.ceil((entry.reset - now) / 1000) };
  }

  entry.count++;
  return { allowed: true };
}

export function rateLimitResponse(retryAfter: number) {
  return NextResponse.json(
    { error: "Too many requests", retryAfter },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}
