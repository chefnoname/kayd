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
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const callerRole = staffUser?.role ?? "staff";
  if (callerRole !== "superadmin" && callerRole !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  // Ban the user in auth (prevents login)
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

  return NextResponse.json({ success: true });
}
