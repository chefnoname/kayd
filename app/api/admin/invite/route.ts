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

  // Use admin client for both the pre-row insert (RLS would block it
  // since the row has no id matching auth.uid()) and the invite call.
  const admin = createAdminClient();

  const normalisedEmail = String(email).trim().toLowerCase();
  const cleanName = String(name).trim();

  // 1) Pre-create the staff_users row in 'pending' state with id=null.
  //    handle_new_user merges this row with the freshly created auth user
  //    when inviteUserByEmail fires, matching on (organisation_id, lower(email)).
  const { error: insertError } = await admin.from("staff_users").insert({
    id: null,
    email: normalisedEmail,
    name: cleanName,
    role: resolvedRole,
    status: "pending",
    invited_by: invited_by || user.id,
    organisation_id: callerOrgId,
  });

  if (insertError) {
    // Duplicate key (already pending or already a member) is the most likely cause.
    return NextResponse.json(
      { error: insertError.message },
      { status: 409 }
    );
  }

  // 2) Send the Supabase invite. Once the user clicks the link, the
  //    handle_new_user trigger fills in id and handle_user_sign_in flips
  //    status to 'active'.
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    normalisedEmail,
    {
      data: {
        name: cleanName,
        role: resolvedRole,
        invited_by: invited_by || user.id,
        // Picked up by handle_new_user so the merge lands in the right org.
        organisation_id: callerOrgId,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/auth/callback?type=invite`,
    }
  );

  if (inviteError) {
    // Roll back the pending row so the admin can retry cleanly.
    await admin
      .from("staff_users")
      .delete()
      .eq("organisation_id", callerOrgId)
      .eq("email", normalisedEmail)
      .is("id", null);

    return NextResponse.json(
      { error: inviteError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
