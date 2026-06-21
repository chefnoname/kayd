import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase-admin";

/**
 * Rate Gate API
 *
 * GET  — check if rate_entries exist for today + current org
 * POST — insert a new rate_entries row and upsert daily_rates.gbp_to_usd
 */

async function getAuthContext() {
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

  if (!user) return null;

  const { data: staffRow } = await supabase
    .from("staff_users")
    .select("organisation_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!staffRow?.organisation_id) return null;

  return { userId: user.id, orgId: staffRow.organisation_id };
}

function todayUTC(): string {
  return new Date().toISOString().split("T")[0];
}

/** GET — has the org already submitted rates today? */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = todayUTC();

  const { data, error } = await admin
    .from("rate_entries")
    .select("id, send_rate, receive_rate, created_at")
    .eq("organisation_id", ctx.orgId)
    .eq("date", today)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data) {
    return NextResponse.json({
      submitted: true,
      send_rate: Number(data.send_rate),
      receive_rate: Number(data.receive_rate),
      submitted_at: data.created_at,
    });
  }

  return NextResponse.json({ submitted: false });
}

/** POST — submit today's rates. Body: { send_rate: number, receive_rate: number } */
export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { send_rate?: number; receive_rate?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sendRate = Number(body.send_rate);
  const receiveRate = Number(body.receive_rate);

  if (!sendRate || sendRate <= 0 || !receiveRate || receiveRate <= 0) {
    return NextResponse.json(
      { error: "Both send_rate and receive_rate must be positive numbers" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const today = todayUTC();

  // 1. Insert audit-trail entry
  const { error: insertErr } = await admin.from("rate_entries").insert({
    organisation_id: ctx.orgId,
    date: today,
    send_rate: sendRate,
    receive_rate: receiveRate,
    submitted_by: ctx.userId,
  });

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // 2. Upsert daily_rates so existing deposit flow keeps working.
  //    Use receive_rate as the gbp_to_usd value (the operational rate).
  const { error: upsertErr } = await admin.from("daily_rates").upsert(
    {
      organisation_id: ctx.orgId,
      date: today,
      gbp_to_usd: receiveRate,
      set_by: ctx.userId,
      set_at: new Date().toISOString(),
    },
    { onConflict: "organisation_id,date" }
  );

  if (upsertErr) {
    // Rate entry was saved — log the upsert error but don't fail the request
    console.error("daily_rates upsert failed:", upsertErr.message);
  }

  return NextResponse.json({
    ok: true,
    send_rate: sendRate,
    receive_rate: receiveRate,
    date: today,
  });
}
