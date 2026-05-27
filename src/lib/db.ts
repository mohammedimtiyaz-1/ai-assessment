import { createClient } from "@supabase/supabase-js";
import { env } from "./env";
import { logger } from "./logger";

const globalForDb = globalThis as unknown as {
  __supabase?: ReturnType<typeof createClient>;
  __supabaseAdmin?: ReturnType<typeof createClient>;
};

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

logger.info(
  { url: supabaseUrl, hasServiceRole: !!env.SUPABASE_SERVICE_ROLE_KEY },
  "Initializing Supabase client"
);

export class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseConfigError";
  }
}

export const supabase = globalForDb.__supabase ?? createClient(supabaseUrl, anonKey);

export function getSupabaseAdmin() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.error("SUPABASE_SERVICE_ROLE_KEY is missing. Admin operations are disabled.");
    throw new SupabaseConfigError("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  if (!globalForDb.__supabaseAdmin) {
    globalForDb.__supabaseAdmin = createClient(supabaseUrl, env.SUPABASE_SERVICE_ROLE_KEY);
  }

  return globalForDb.__supabaseAdmin;
}

if (env.NODE_ENV !== "production") {
  globalForDb.__supabase = supabase;
  // Admin client is cached lazily via getSupabaseAdmin
}
