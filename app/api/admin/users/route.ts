import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  // Authenticate the caller
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

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get caller's org + confirm they are admin/superadmin
  const { data: callerStaff } = await supabase
    .from("staff_users")
    .select("organisation_id, role")
    .eq("id", user.id)
    .single();

  if (
    !callerStaff ||
    !["admin", "superadmin"].includes(callerStaff.role as string)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = callerStaff.organisation_id as string;

  // Fetch staff_users for the org (role, status, etc.)
  const { data: staffRows, error: staffErr } = await supabase
    .from("staff_users")
    .select("id, email, name, role, status, invited_by, created_at")
    .eq("organisation_id", orgId)
    .order("created_at", { ascending: true });

  if (staffErr) {
    return NextResponse.json({ error: staffErr.message }, { status: 500 });
  }

  // Fetch auth.users via service-role client for metadata + last_sign_in_at
  const adminClient = createAdminClient();
  const { data: authData, error: authErr } =
    await adminClient.auth.admin.listUsers({ perPage: 1000 });

  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 500 });
  }

  // Build lookup by user ID
  const authMap = new Map(authData.users.map((u) => [u.id, u]));

  // Merge: name from raw_user_meta_data, last_sign_in_at from auth.users
  const users = (staffRows ?? []).map((s) => {
    const authUser = authMap.get(s.id);
    const meta = (authUser?.user_metadata ?? {}) as Record<string, unknown>;
    return {
      id: s.id,
      email: s.email,
      name: (meta.name as string | undefined) || s.name || null,
      role: s.role,
      status: s.status ?? "active",
      invited_by: s.invited_by,
      created_at: s.created_at,
      last_sign_in_at: authUser?.last_sign_in_at ?? null,
    };
  });

  return NextResponse.json({ users });
}
