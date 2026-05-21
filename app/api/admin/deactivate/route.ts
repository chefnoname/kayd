import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
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
  const { userId } = body;

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required." },
      { status: 400 }
    );
  }

  if (userId === user.id) {
    return NextResponse.json(
      { error: "Cannot deactivate yourself." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Make sure the target belongs to the caller's organisation before we ban
  // them in auth (which is a cross-table side effect not covered by RLS).
  const { data: target } = await admin
    .from("staff_users")
    .select("id")
    .eq("id", userId)
    .eq("organisation_id", callerOrgId)
    .maybeSingle();

  if (!target) {
    return NextResponse.json(
      { error: "User not found in your organisation." },
      { status: 404 }
    );
  }

  // Ban the user in auth (prevents login + revokes existing sessions)
  const { error: banError } = await admin.auth.admin.updateUserById(
    userId,
    { ban_duration: "876600h" } // ~100 years
  );

  if (banError) {
    return NextResponse.json(
      { error: banError.message },
      { status: 500 }
    );
  }

  // Mirror status into staff_users so the UI can show it
  const { error: statusError } = await admin
    .from("staff_users")
    .update({ status: "inactive" })
    .eq("id", userId)
    .eq("organisation_id", callerOrgId);

  if (statusError) {
    return NextResponse.json(
      { error: statusError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
