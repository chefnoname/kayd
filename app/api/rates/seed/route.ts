import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase-admin";
import { fetchRates } from "@/lib/rates";

export async function POST() {
  const cookieStore = await cookies();

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

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: staffRow } = await supabase
    .from("staff_users")
    .select("organisation_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!staffRow?.organisation_id) {
    return NextResponse.json({ error: "No organisation found" }, { status: 404 });
  }

  const orgId = staffRow.organisation_id;
  const today = new Date().toISOString().split("T")[0];

  const admin = createAdminClient();

  // Check if rate already exists for today
  const { data: existing } = await admin
    .from("daily_rates")
    .select("gbp_to_usd")
    .eq("organisation_id", orgId)
    .eq("date", today)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ gbp_to_usd: Number(existing.gbp_to_usd), seeded: false });
  }

  let rates;
  try {
    rates = await fetchRates();
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }

  const gbpToUsd = rates.gbpToUsd.spot_rate;

  const { error } = await admin.from("daily_rates").upsert(
    {
      organisation_id: orgId,
      date: today,
      gbp_to_usd: gbpToUsd,
      set_by: null,
      set_at: rates.fetchedAt,
    },
    { onConflict: "organisation_id,date" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ gbp_to_usd: gbpToUsd, seeded: true });
}
