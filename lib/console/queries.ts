/**
 * Server-side reads for the Kayd console. Service role only; callers must
 * have checked the Kayd staff member first.
 */
import { createAdminClient } from "@/lib/supabase-admin";
import {
  describeEvent,
  filterForType,
  isActivityType,
  type ActivityRow,
  type ActivityType,
  type DescribedEvent,
} from "@/lib/console/activity";

export type ActivityFilters = {
  org: string | null;
  person: string | null;
  type: ActivityType | null;
  from: string | null; // yyyy-mm-dd
  to: string | null; // yyyy-mm-dd
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function one(v: string | string[] | null | undefined): string | null {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.length > 0 ? s : null;
}

export function parseActivityFilters(
  params: Record<string, string | string[] | undefined> | URLSearchParams
): ActivityFilters {
  const get = (k: string) =>
    params instanceof URLSearchParams ? params.get(k) : one(params[k]);
  const org = get("org");
  const person = get("person");
  const type = get("type");
  const from = get("from");
  const to = get("to");
  return {
    org: org && UUID.test(org) ? org : null,
    person: person && UUID.test(person) ? person : null,
    type: isActivityType(type) ? type : null,
    from: from && DAY.test(from) ? from : null,
    to: to && DAY.test(to) ? to : null,
  };
}

export type ActivityLine = DescribedEvent & {
  id: number;
  createdAt: string;
  organisationId: string | null;
  organisationName: string;
  actorName: string;
  actorKind: "client" | "kayd" | "system";
};

export async function loadActivity(
  filters: ActivityFilters,
  showAmounts: boolean,
  limit = 200
): Promise<ActivityLine[]> {
  const admin = createAdminClient();
  let q = admin
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.org) q = q.eq("organisation_id", filters.org);
  if (filters.person) q = q.eq("actor_id", filters.person);
  if (filters.from) q = q.gte("created_at", `${filters.from}T00:00:00Z`);
  if (filters.to) q = q.lte("created_at", `${filters.to}T23:59:59Z`);
  if (filters.type) {
    const f = filterForType(filters.type);
    if (f.entityTypes) q = q.in("entity_type", f.entityTypes);
    if (f.actions) q = q.in("action", f.actions);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as ActivityRow[];

  const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean))) as string[];
  const orgIds = Array.from(new Set(rows.map((r) => r.organisation_id).filter(Boolean))) as string[];
  const agentIds = Array.from(
    new Set(
      rows
        .filter((r) => r.entity_type === "agent_deposits")
        .map((r) => String((r.new_data ?? r.old_data ?? {}).agent_id ?? ""))
        .filter(Boolean)
    )
  );
  const officeIds = Array.from(
    new Set(
      rows
        .filter((r) => r.entity_type === "collection_pickups")
        .map((r) => String((r.new_data ?? r.old_data ?? {}).office_id ?? ""))
        .filter(Boolean)
    )
  );

  const [people, kayd, orgs, agents, offices] = await Promise.all([
    actorIds.length
      ? admin.from("staff_users").select("id, name").in("id", actorIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    actorIds.length
      ? admin.from("kayd_staff").select("id, name").in("id", actorIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    orgIds.length
      ? admin.from("organisations").select("id, name").in("id", orgIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    agentIds.length
      ? admin.from("agents").select("id, name").in("id", agentIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    officeIds.length
      ? admin.from("regional_offices").select("id, name").in("id", officeIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const map = (list: { id: string; name: string }[] | null | undefined) =>
    Object.fromEntries((list ?? []).map((x) => [x.id, x.name]));
  const personNames = map(people.data);
  const kaydNames = map(kayd.data);
  const orgNames = map(orgs.data);
  const names = { agents: map(agents.data), offices: map(offices.data) };

  return rows.map((r) => {
    const described = describeEvent(r, showAmounts, names);
    const actorKind: ActivityLine["actorKind"] = !r.actor_id
      ? "system"
      : kaydNames[r.actor_id]
        ? "kayd"
        : "client";
    return {
      ...described,
      id: r.id,
      createdAt: r.created_at,
      organisationId: r.organisation_id,
      organisationName: r.organisation_id ? orgNames[r.organisation_id] ?? "Deleted organisation" : "No organisation",
      actorName: r.actor_id
        ? kaydNames[r.actor_id]
          ? `${kaydNames[r.actor_id]} (Kayd)`
          : personNames[r.actor_id] ?? "Removed person"
        : "System",
      actorKind,
    };
  });
}

export type OrgSummary = {
  id: string;
  name: string;
  status: "active" | "trial" | "suspended";
  createdAt: string;
  adminName: string | null;
  people: number;
  locations: number;
  lastActivity: string | null;
  renewsOn: string | null;
  trialEndsOn: string | null;
  plan: string | null;
  priceGbpMonthly: number | null;
};

export async function loadOrganisations(): Promise<OrgSummary[]> {
  const admin = createAdminClient();
  const [orgs, people, offices] = await Promise.all([
    admin
      .from("organisations")
      .select("id, name, status, created_at, renews_on, trial_ends_on, plan, price_gbp_monthly")
      .order("name"),
    admin.from("staff_users").select("organisation_id, name, role, last_active_at"),
    admin.from("regional_offices").select("organisation_id"),
  ]);
  if (orgs.error) throw new Error(orgs.error.message);

  return (orgs.data ?? []).map((o) => {
    const members = (people.data ?? []).filter((p) => p.organisation_id === o.id);
    const admin = members.find((p) => p.role === "admin");
    const last = members
      .map((p) => p.last_active_at as string | null)
      .filter(Boolean)
      .sort()
      .pop() ?? null;
    return {
      id: o.id,
      name: o.name,
      status: (o.status ?? "active") as OrgSummary["status"],
      createdAt: o.created_at,
      adminName: admin?.name ?? null,
      people: members.length,
      locations: (offices.data ?? []).filter((x) => x.organisation_id === o.id).length,
      lastActivity: last,
      renewsOn: o.renews_on,
      trialEndsOn: o.trial_ends_on,
      plan: o.plan,
      priceGbpMonthly: o.price_gbp_monthly === null ? null : Number(o.price_gbp_monthly),
    };
  });
}

export type AccessLogLine = {
  id: number;
  createdAt: string;
  staffName: string;
  action: string;
  targetName: string | null;
  reason: string | null;
  organisationId: string | null;
};

export async function loadAccessLog(
  organisationId: string | null,
  limit = 50
): Promise<AccessLogLine[]> {
  const admin = createAdminClient();
  let q = admin
    .from("kayd_access_log")
    .select("id, created_at, staff_name, action, target_name, reason, organisation_id")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (organisationId) q = q.eq("organisation_id", organisationId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    staffName: r.staff_name,
    action: r.action,
    targetName: r.target_name,
    reason: r.reason,
    organisationId: r.organisation_id,
  }));
}
