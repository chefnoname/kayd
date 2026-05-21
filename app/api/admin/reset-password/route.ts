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
      { error: "Cannot reset your own password this way." },
      { status: 400 }
    );
  }

  // Get the target user's email
  const admin = createAdminClient();

  // Verify the target lives in the caller's organisation
  const { data: targetRow } = await admin
    .from("staff_users")
    .select("id")
    .eq("id", userId)
    .eq("organisation_id", callerOrgId)
    .maybeSingle();

  if (!targetRow) {
    return NextResponse.json(
      { error: "User not found in your organisation." },
      { status: 404 }
    );
  }

  const { data: targetUser, error: fetchError } =
    await admin.auth.admin.getUserById(userId);

  if (fetchError || !targetUser?.user?.email) {
    return NextResponse.json(
      { error: "User not found." },
      { status: 404 }
    );
  }

  // Send a magic link / password reset
  const { error: resetError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: targetUser.user.email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/auth/callback?type=recovery`,
    },
  });

  if (resetError) {
    return NextResponse.json(
      { error: resetError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
