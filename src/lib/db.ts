import { createClient } from '@supabase/supabase-js';
import { env } from "./env";
import { logger } from "./logger";

const globalForDb = globalThis as unknown as {
  __supabase?: ReturnType<typeof createClient>;
};

// Use service role key for server-side operations if available, otherwise use anon key
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

logger.info({ url: supabaseUrl, hasServiceRole: !!env.SUPABASE_SERVICE_ROLE_KEY }, "Initializing Supabase client");

export const supabase = globalForDb.__supabase ?? createClient(supabaseUrl, supabaseKey);

if (env.NODE_ENV !== "production") {
  globalForDb.__supabase = supabase;
}
