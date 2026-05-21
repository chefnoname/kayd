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
  const { userId, newRole } = body;

  if (!userId || !newRole) {
    return NextResponse.json(
      { error: "userId and newRole are required." },
      { status: 400 }
    );
  }

  if (!["admin", "staff"].includes(newRole)) {
    return NextResponse.json(
      { error: "Invalid role." },
      { status: 400 }
    );
  }

  // Admins can only set 'staff'
  if (callerRole === "admin" && newRole === "admin") {
    return NextResponse.json(
      { error: "Admins cannot promote to admin." },
      { status: 403 }
    );
  }

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("staff_users")
    .update({ role: newRole })
    .eq("id", userId)
    .eq("organisation_id", callerOrgId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
