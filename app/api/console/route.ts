/**
 * Every Kayd console action goes through this one route, so each is checked
 * and logged the same way:
 *   1. The caller must be active Kayd staff (verified server-side).
 *   2. The action is written to kayd_access_log BEFORE it takes effect where
 *      it reveals data, and straight after where it changes something.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  AMOUNT_GRANT_MINUTES,
  consoleUrl,
  logKaydAccess,
  requireConsoleStaff,
  sendPasswordEmail,
  siteUrl,
  type ConsoleStaff,
} from "@/lib/console/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BAN_FOREVER = "876000h"; // 100 years

type Body = Record<string, unknown>;

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function text(v: unknown, max = 500): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function id(v: unknown): string | null {
  return typeof v === "string" && UUID.test(v) ? v : null;
}

async function loadPerson(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("staff_users")
    .select("id, name, email, organisation_id")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

async function loadOrg(orgId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("organisations")
    .select("id, name, status")
    .eq("id", orgId)
    .maybeSingle();
  return data;
}

async function handle(staff: ConsoleStaff, body: Body, origin: string) {
  const admin = createAdminClient();
  const action = text(body.action, 40);

  switch (action) {
    // ── People ────────────────────────────────────────────────────────
    case "send_reset": {
      const userId = id(body.userId);
      const person = userId && (await loadPerson(userId));
      if (!person) return bad("Person not found.", 404);
      await sendPasswordEmail(person.email, `${siteUrl() || origin}/login`);
      await logKaydAccess(staff, {
        organisationId: person.organisation_id,
        action: "sent_reset",
        targetUserId: person.id,
        targetName: person.name,
      });
      return NextResponse.json({ ok: true, message: `Reset link sent to ${person.email}.` });
    }

    case "sign_out": {
      const userId = id(body.userId);
      const person = userId && (await loadPerson(userId));
      if (!person) return bad("Person not found.", 404);
      const { error } = await admin.rpc("kayd_revoke_sessions", { target: person.id });
      if (error) return bad(error.message, 500);
      await logKaydAccess(staff, {
        organisationId: person.organisation_id,
        action: "signed_out",
        targetUserId: person.id,
        targetName: person.name,
      });
      return NextResponse.json({ ok: true, message: `${person.name} has been signed out of every device.` });
    }

    case "lock": {
      const userId = id(body.userId);
      const reason = text(body.reason);
      if (reason.length < 5) return bad("Give a reason of at least 5 characters.");
      const person = userId && (await loadPerson(userId));
      if (!person) return bad("Person not found.", 404);
      const { error: e1 } = await admin
        .from("staff_users")
        .update({ locked_at: new Date().toISOString(), locked_reason: reason })
        .eq("id", person.id);
      if (e1) return bad(e1.message, 500);
      await admin.auth.admin.updateUserById(person.id, { ban_duration: BAN_FOREVER });
      await admin.rpc("kayd_revoke_sessions", { target: person.id });
      await logKaydAccess(staff, {
        organisationId: person.organisation_id,
        action: "locked",
        targetUserId: person.id,
        targetName: person.name,
        reason,
      });
      return NextResponse.json({ ok: true, message: `${person.name} is locked and signed out.` });
    }

    case "unlock": {
      const userId = id(body.userId);
      const person = userId && (await loadPerson(userId));
      if (!person) return bad("Person not found.", 404);
      const { error: e1 } = await admin
        .from("staff_users")
        .update({ locked_at: null, locked_reason: null })
        .eq("id", person.id);
      if (e1) return bad(e1.message, 500);
      await admin.auth.admin.updateUserById(person.id, { ban_duration: "none" });
      await logKaydAccess(staff, {
        organisationId: person.organisation_id,
        action: "unlocked",
        targetUserId: person.id,
        targetName: person.name,
      });
      return NextResponse.json({ ok: true, message: `${person.name} can sign in again.` });
    }

    // ── Organisations ────────────────────────────────────────────────
    case "suspend": {
      const orgId = id(body.organisationId);
      const reason = text(body.reason);
      if (reason.length < 5) return bad("Give a reason of at least 5 characters.");
      const org = orgId && (await loadOrg(orgId));
      if (!org) return bad("Organisation not found.", 404);
      const { error } = await admin
        .from("organisations")
        .update({
          status: "suspended",
          suspended_at: new Date().toISOString(),
          suspended_reason: reason,
          suspended_by: staff.id,
        })
        .eq("id", org.id);
      if (error) return bad(error.message, 500);
      const { data: members } = await admin
        .from("staff_users")
        .select("id")
        .eq("organisation_id", org.id);
      await Promise.all(
        (members ?? []).map((m) => admin.rpc("kayd_revoke_sessions", { target: m.id }))
      );
      await logKaydAccess(staff, { organisationId: org.id, action: "suspended", reason });
      return NextResponse.json({ ok: true, message: `${org.name} is suspended. Everyone has been signed out.` });
    }

    case "reactivate": {
      const orgId = id(body.organisationId);
      const org = orgId && (await loadOrg(orgId));
      if (!org) return bad("Organisation not found.", 404);
      const { error } = await admin
        .from("organisations")
        .update({ status: "active", suspended_at: null, suspended_reason: null, suspended_by: null })
        .eq("id", org.id);
      if (error) return bad(error.message, 500);
      await logKaydAccess(staff, { organisationId: org.id, action: "reactivated" });
      return NextResponse.json({ ok: true, message: `${org.name} is active again.` });
    }

    case "show_amounts": {
      const orgId = id(body.organisationId);
      const reason = text(body.reason);
      if (reason.length < 10) return bad("Give a reason of at least 10 characters.");
      const org = orgId && (await loadOrg(orgId));
      if (!org) return bad("Organisation not found.", 404);
      const expiresAt = new Date(Date.now() + AMOUNT_GRANT_MINUTES * 60_000).toISOString();
      await logKaydAccess(staff, {
        organisationId: org.id,
        action: "viewed_amounts",
        reason,
        expiresAt,
      });
      return NextResponse.json({ ok: true, expiresAt });
    }

    case "update_subscription": {
      const orgId = id(body.organisationId);
      const org = orgId && (await loadOrg(orgId));
      if (!org) return bad("Organisation not found.", 404);
      const day = (v: unknown) =>
        typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
      const price =
        body.priceGbpMonthly === "" || body.priceGbpMonthly === null || body.priceGbpMonthly === undefined
          ? null
          : Number(body.priceGbpMonthly);
      if (price !== null && (!Number.isFinite(price) || price < 0)) return bad("Price must be a positive number.");
      const statusIn = text(body.status, 20);
      const status = org.status === "suspended" ? "suspended" : statusIn === "trial" ? "trial" : "active";
      const { error } = await admin
        .from("organisations")
        .update({
          plan: text(body.plan, 60) || null,
          price_gbp_monthly: price,
          renews_on: day(body.renewsOn),
          trial_ends_on: day(body.trialEndsOn),
          status,
        })
        .eq("id", org.id);
      if (error) return bad(error.message, 500);
      await logKaydAccess(staff, { organisationId: org.id, action: "subscription_updated" });
      return NextResponse.json({ ok: true, message: "Subscription saved." });
    }

    // ── Kayd staff ───────────────────────────────────────────────────
    case "invite_staff": {
      const name = text(body.name, 100);
      const email = text(body.email, 200).toLowerCase();
      if (!name) return bad("Name is required.");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad("Enter a valid email address.");
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        app_metadata: { kayd_staff: true },
        user_metadata: { name },
      });
      if (error || !created.user) return bad(error?.message ?? "Could not create the account.", 500);
      const { error: e2 } = await admin
        .from("kayd_staff")
        .insert({ id: created.user.id, email, name, invited_by: staff.id });
      if (e2) return bad(e2.message, 500);
      await sendPasswordEmail(email, `${consoleUrl(origin)}/console/login`);
      await logKaydAccess(staff, {
        organisationId: null,
        action: "staff_invited",
        targetUserId: created.user.id,
        targetName: name,
      });
      return NextResponse.json({ ok: true, message: `Invite sent to ${email}.` });
    }

    case "remove_staff": {
      const userId = id(body.userId);
      if (!userId) return bad("Person not found.", 404);
      if (userId === staff.id) return bad("You can't remove yourself.");
      const { data: target } = await admin
        .from("kayd_staff")
        .select("id, name, removed_at")
        .eq("id", userId)
        .maybeSingle();
      if (!target || target.removed_at) return bad("Person not found.", 404);
      const { error } = await admin
        .from("kayd_staff")
        .update({ removed_at: new Date().toISOString() })
        .eq("id", userId);
      if (error) return bad(error.message, 500);
      await admin.auth.admin.updateUserById(userId, { ban_duration: BAN_FOREVER });
      await admin.rpc("kayd_revoke_sessions", { target: userId });
      await logKaydAccess(staff, {
        organisationId: null,
        action: "staff_removed",
        targetUserId: userId,
        targetName: target.name,
      });
      return NextResponse.json({ ok: true, message: `${target.name} can no longer open the console.` });
    }

    default:
      return bad("Unknown action.");
  }
}

export async function POST(request: NextRequest) {
  const staff = await requireConsoleStaff(request);
  if (!staff) return bad("Forbidden", 403);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return bad("Invalid request.");
  }

  try {
    return await handle(staff, body, request.nextUrl.origin);
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Something went wrong.", 500);
  }
}
