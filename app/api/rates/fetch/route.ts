import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { fetchRates } from "@/lib/rates";

export async function POST(request: NextRequest) {
  const secret = process.env.RATES_API_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const auth = request.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (auth.slice(7) !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let rates;
  try {
    rates = await fetchRates();
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }

  // daily_rates.gbp_to_usd stores the GBP→USD rate (£1 = $X.XXXX convention).
  // fetchRates() returns gbpToUsd.spot_rate = 1 / usdToGbpRate, which matches.
  const gbpToUsd = rates.gbpToUsd.spot_rate;
  const today = new Date().toISOString().split("T")[0];

  const admin = createAdminClient();

  const { data: orgs, error: orgsErr } = await admin
    .from("organisations")
    .select("id");

  if (orgsErr) {
    return NextResponse.json({ error: orgsErr.message }, { status: 500 });
  }
  if (!orgs?.length) {
    return NextResponse.json({ error: "No organisations found" }, { status: 500 });
  }

  const rows = orgs.map((org) => ({
    organisation_id: org.id,
    date: today,
    gbp_to_usd: gbpToUsd,
    set_by: null,
    set_at: rates.fetchedAt,
  }));

  const { error: upsertErr } = await admin
    .from("daily_rates")
    .upsert(rows, { onConflict: "organisation_id,date" });

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    gbp_to_usd_rate: gbpToUsd,
    usd_to_gbp_rate: rates.usdToGbp.spot_rate,
    orgs_updated: orgs.length,
    timestamp: rates.fetchedAt,
  });
}
