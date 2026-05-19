import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  // Surface a clear error at boot rather than a cryptic runtime crash
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
      "Copy .env.local.example to .env.local and fill in the values."
  );
}

/**
 * Browser-side Supabase client. Safe to import in client components.
 */
export function createClient(): SupabaseClient {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Simple shared client for non-SSR usage (utilities, scripts).
 */
export const supabase: SupabaseClient = createSupabaseClient(
  supabaseUrl ?? "",
  supabaseAnonKey ?? ""
);
