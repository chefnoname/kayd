import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
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

  // Check caller's role + org
  const { data: staffUser } = await supabase
    .from("staff_users")
    .select("role, organisation_id")
    .eq("id", user.id)
    .maybeSingle();

  const callerRole = staffUser?.role ?? "staff";
  const callerOrgId = (staffUser?.organisation_id as string | null) ?? null;

  if (callerRole !== "superadmin" && callerRole !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!callerOrgId) {
    return NextResponse.json(
      { error: "Your account is not attached to an organisation." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { email, name, role, invited_by } = body;

  if (!email || !name) {
    return NextResponse.json(
      { error: "Email and name are required." },
      { status: 400 }
    );
  }

  // Admins can only invite staff (admins cannot create other admins).
  const resolvedRole =
    callerRole === "admin" ? "staff" : role || "staff";

  if (callerRole === "admin" && role && role !== "staff") {
    return NextResponse.json(
      { error: "Admins cannot create other admins." },
      { status: 403 }
    );
  }

  // Use admin client to send invite
  const admin = createAdminClient();

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        name,
        role: resolvedRole,
        invited_by: invited_by || user.id,
        // The handle_new_user trigger picks this up so the invitee is
        // provisioned inside the inviter's organisation as `staff`.
        organisation_id: callerOrgId,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/auth/callback?type=invite`,
    }
  );

  if (inviteError) {
    return NextResponse.json(
      { error: inviteError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
