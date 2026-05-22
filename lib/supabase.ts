import { createBrowserClient } from "@supabase/ssr";
import {
  createClient as createSupabaseClient,
  SupabaseClient,
  SupportedStorage,
} from "@supabase/supabase-js";

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
 * Cookie-backed SupportedStorage adapter.
 *
 * Used as the auth.storage for the standalone Supabase client so that PKCE
 * code verifiers and session tokens survive the auth redirect on both browser
 * and server (SSR) environments where localStorage is unavailable.
 *
 * - Browser: reads/writes document.cookie
 * - Server / SSR: falls back to an ephemeral in-memory Map
 *   (the SSR createServerClient owns real cookie I/O on the server side)
 *
 * Cookies are set with SameSite=Lax; max-age=600 (10 min) — long enough for
 * the 5-minute PKCE code window plus network latency.
 */
function createCookieStorageAdapter(): SupportedStorage {
  if (typeof document === "undefined") {
    // Server context — ephemeral store; actual session persistence is handled
    // by createServerClient (middleware.ts, callback route).
    const store = new Map<string, string>();
    return {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => { store.set(key, value); },
      removeItem: (key) => { store.delete(key); },
    };
  }

  return {
    getItem(key: string): string | null {
      const encoded = encodeURIComponent(key);
      const match = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${encoded}=`));
      if (!match) return null;
      return decodeURIComponent(match.slice(encoded.length + 1));
    },
    setItem(key: string, value: string): void {
      document.cookie = [
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
        "path=/",
        "SameSite=Lax",
        "max-age=600",
      ].join("; ");
    },
    removeItem(key: string): void {
      document.cookie = [
        `${encodeURIComponent(key)}=`,
        "path=/",
        "max-age=0",
      ].join("; ");
    },
  };
}

/**
 * Browser-side Supabase client. Safe to import in client components.
 *
 * Uses PKCE flow so that email confirmation / invite / magic-link callbacks
 * exchange an auth code (not an implicit token fragment) for a session.
 * detectSessionInUrl lets the client library handle the exchange automatically
 * when it sees ?code=... in the URL.
 *
 * NOTE: We do NOT pass auth.storage here because createBrowserClient from
 * @supabase/ssr already owns cookie-based session storage. Overriding it
 * would break server-side session reads in middleware and API routes.
 */
export function createClient(): SupabaseClient {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: true,
    },
  });
}

/**
 * Simple shared client for non-SSR usage (utilities, scripts).
 *
 * Uses the cookie storage adapter so PKCE code verifiers and sessions work
 * even when localStorage is unavailable (e.g. Node.js scripts, Edge runtime).
 */
export const supabase: SupabaseClient = createSupabaseClient(
  supabaseUrl ?? "",
  supabaseAnonKey ?? "",
  {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: true,
      storage: createCookieStorageAdapter(),
    },
  }
);
