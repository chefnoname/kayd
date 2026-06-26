import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase-admin";

/** Verify the caller is authenticated and return their org + role. */
async function getCallerContext(request: NextRequest) {
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

  const { data: staffRow } = await supabase
    .from("staff_users")
    .select("role, organisation_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!staffRow?.organisation_id) return null;

  return {
    orgId: staffRow.organisation_id as string,
    role: (staffRow.role as string) ?? "staff",
  };
}

/**
 * GET /api/org/session-timeout
 * Returns the org-level session timeout override (minutes), or null if
 * the org uses the application default.
 */
export async function GET(request: NextRequest) {
  const ctx = await getCallerContext(request);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organisations")
    .select("session_timeout_minutes")
    .eq("id", ctx.orgId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    session_timeout_minutes: data?.session_timeout_minutes ?? null,
  });
}

/**
 * PATCH /api/org/session-timeout
 * Updates the org-level session timeout. Superadmin only.
 *
 * Body: { session_timeout_minutes: number | null }
 *   - number (1–1440): custom timeout in minutes
 *   - null: revert to application default
 */
export async function PATCH(request: NextRequest) {
  const ctx = await getCallerContext(request);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (ctx.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const value = body.session_timeout_minutes;

  if (value !== null && (typeof value !== "number" || value < 1 || value > 1440)) {
    return NextResponse.json(
      { error: "session_timeout_minutes must be a number between 1 and 1440, or null." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organisations")
    .update({ session_timeout_minutes: value })
    .eq("id", ctx.orgId)
    .select("session_timeout_minutes")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    session_timeout_minutes: data.session_timeout_minutes ?? null,
  });
}
