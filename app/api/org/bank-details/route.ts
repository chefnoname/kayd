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
 * GET /api/org/bank-details
 * Returns the bank details for the authenticated user's organisation.
 * Accessible to all authenticated staff.
 */
export async function GET(request: NextRequest) {
  const ctx = await getCallerContext(request);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: orgRow, error } = await admin
    .from("organisations")
    .select("bank_name, sort_code, account_number")
    .eq("id", ctx.orgId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    bank_name: orgRow?.bank_name ?? null,
    sort_code: orgRow?.sort_code ?? null,
    account_number: orgRow?.account_number ?? null,
  });
}

/**
 * PATCH /api/org/bank-details
 * Updates the bank details for the authenticated user's organisation.
 * Restricted to admin role only.
 *
 * Body: { bank_name?: string | null, sort_code?: string | null, account_number?: string | null }
 * Response: { bank_name: string | null, sort_code: string | null, account_number: string | null }
 */
export async function PATCH(request: NextRequest) {
  const ctx = await getCallerContext(request);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (ctx.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { bank_name, sort_code, account_number } = body as {
    bank_name?: string | null;
    sort_code?: string | null;
    account_number?: string | null;
  };

  const patch: Record<string, string | null> = {};
  if ("bank_name" in body) patch.bank_name = bank_name?.trim() || null;
  if ("sort_code" in body) patch.sort_code = sort_code?.trim() || null;
  if ("account_number" in body)
    patch.account_number = account_number?.trim() || null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "No fields provided to update." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from("organisations")
    .update(patch)
    .eq("id", ctx.orgId)
    .select("bank_name, sort_code, account_number")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    bank_name: updated.bank_name ?? null,
    sort_code: updated.sort_code ?? null,
    account_number: updated.account_number ?? null,
  });
}
