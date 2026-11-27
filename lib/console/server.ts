/**
 * Server-only helpers for the Kayd console.
 *
 * Every console page and API route must call `getConsoleStaff()` (pages) or
 * `requireConsoleStaff(request)` (routes) first. Both verify the session with
 * the auth server and then check `kayd_staff` with the service role, so a
 * client account can never reach console data even with a valid session.
 *
 * Never import this file from a client component.
 */
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase-admin";

export type ConsoleStaff = { id: string; name: string; email: string };

/** How long amounts stay visible after a break-glass reason is given. */
export const AMOUNT_GRANT_MINUTES = 15;

async function staffFromUserId(userId: string): Promise<ConsoleStaff | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("kayd_staff")
    .select("id, name, email, removed_at")
    .eq("id", userId)
    .maybeSingle();
  if (!data || data.removed_at) return null;
  return { id: data.id, name: data.name, email: data.email };
}

/** For server components: the signed-in Kayd staff member, or null. */
export async function getConsoleStaff(): Promise<ConsoleStaff | null> {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return staffFromUserId(user.id);
}

/** For route handlers: the signed-in Kayd staff member, or null. */
export async function requireConsoleStaff(
  request: NextRequest
): Promise<ConsoleStaff | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return staffFromUserId(user.id);
}

export type AccessEntry = {
  organisationId: string | null;
  action: string;
  targetUserId?: string | null;
  targetName?: string | null;
  reason?: string | null;
  expiresAt?: string | null;
};

/** Write one row to the append-only Kayd access log. Throws on failure. */
export async function logKaydAccess(
  staff: ConsoleStaff,
  entry: AccessEntry
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("kayd_access_log").insert({
    organisation_id: entry.organisationId,
    staff_id: staff.id,
    staff_name: staff.name,
    action: entry.action,
    target_user_id: entry.targetUserId ?? null,
    target_name: entry.targetName ?? null,
    reason: entry.reason ?? null,
    expires_at: entry.expiresAt ?? null,
  });
  if (error) throw new Error(`Could not write the access log: ${error.message}`);
}

/** When this staff member's amount grant for an organisation ends, or null. */
export async function amountGrantUntil(
  staffId: string,
  organisationId: string
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("kayd_access_log")
    .select("expires_at")
    .eq("staff_id", staffId)
    .eq("organisation_id", organisationId)
    .eq("action", "viewed_amounts")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.expires_at as string | undefined) ?? null;
}

/**
 * Email a password-reset link. Uses the implicit flow so the link works on
 * any device: Supabase sends the person to `redirectTo` with the session in
 * the URL fragment, which the login pages already handle.
 */
export async function sendPasswordEmail(
  email: string,
  redirectTo: string
): Promise<void> {
  const client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false } }
  );
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(error.message);
}

/** Origin of the client app, for links in emails. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
}

/** Origin of the console, for links in Kayd staff emails. */
export function consoleUrl(fallbackOrigin: string): string {
  const host = process.env.CONSOLE_HOST;
  return host ? `https://${host}` : fallbackOrigin;
}
