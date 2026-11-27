import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { loadAccessLog } from "@/lib/console/queries";
import { ACCESS_ACTION_LABEL } from "@/lib/console/activity";
import { daysAgo, formatDate, formatDateTime } from "@/lib/console/format";
import { OrgStatusPill, PersonStatusPill } from "@/components/console/StatusPill";
import { OrgActions } from "@/components/console/OrgActions";
import styles from "../../../console.module.css";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OrganisationPage({ params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) notFound();
  const admin = createAdminClient();

  const [{ data: org }, { data: people }, { data: offices }, access] = await Promise.all([
    admin
      .from("organisations")
      .select("id, name, status, created_at, suspended_at, suspended_reason")
      .eq("id", params.id)
      .maybeSingle(),
    admin
      .from("staff_users")
      .select("id, name, email, role, last_active_at, locked_at")
      .eq("organisation_id", params.id)
      .order("role")
      .order("name"),
    admin.from("regional_offices").select("id, name").eq("organisation_id", params.id).order("name"),
    loadAccessLog(params.id, 20),
  ]);
  if (!org) notFound();

  const members = people ?? [];
  const adminPerson = members.find((p) => p.role === "admin");
  const lastActivity = members
    .map((p) => p.last_active_at as string | null)
    .filter(Boolean)
    .sort()
    .pop();
  const suspended = org.status === "suspended";

  return (
    <>
      <Link href="/console" className={styles.back}>← Organisations</Link>
      <header className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{org.name}</h1>
            <OrgStatusPill status={org.status} />
          </div>
          <p className={styles.lede}>
            Client since {formatDate(org.created_at)} · Admin: {adminPerson?.name ?? "None"} · Last activity{" "}
            {formatDateTime(lastActivity)}
          </p>
        </div>
        <div className={styles.actions}>
          <Link
            href={`/console/activity?org=${org.id}`}
            className={styles.linkButton}
          >
            View activity
          </Link>
          <OrgActions organisationId={org.id} name={org.name} suspended={suspended} people={members.length} />
        </div>
      </header>

      {suspended && (
        <div role="status" className={styles.noticeBad}>
          <strong>Suspended {formatDateTime(org.suspended_at)}.</strong> Reason: {org.suspended_reason ?? "None given"}.
          No one in this organisation can sign in until it is reactivated.
        </div>
      )}

      <section aria-label="Summary" className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>People</div>
          <div className={styles.statValue}>{members.length}</div>
          <div className={styles.statNote}>
            {members.filter((m) => m.role === "admin").length} admin,{" "}
            {members.filter((m) => m.role !== "admin").length} staff
          </div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Locations</div>
          <div className={styles.statValue}>{offices?.length ?? 0}</div>
          <div className={styles.statNote}>{(offices ?? []).map((o) => o.name).join(", ") || "None yet"}</div>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="people-h">
        <div className={styles.cardHead}>
          <h2 id="people-h" className={styles.cardTitle}>People</h2>
          <span className={styles.muted}>Open a person to reset access</span>
        </div>
        {members.length === 0 ? (
          <p className={styles.empty}>No people yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Role</th>
                  <th scope="col">Last sign-in</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((p) => (
                  <tr key={p.id} className={styles.clickRow}>
                    <td>
                      <Link className={styles.rowLink} href={`/console/people/${p.id}`}>
                        {p.name}
                      </Link>
                      <div className={styles.sub}>{p.email}</div>
                    </td>
                    <td>{p.role === "admin" ? <span className={styles.pillInfo}>Admin</span> : "Staff"}</td>
                    <td>{formatDateTime(p.last_active_at)}</td>
                    <td>
                      <PersonStatusPill lockedAt={p.locked_at} inactiveDays={daysAgo(p.last_active_at)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.card} aria-labelledby="access-h">
        <div className={styles.cardHead}>
          <div>
            <h2 id="access-h" className={styles.cardTitle}>Kayd access to this organisation</h2>
            <p className={styles.cardNote}>The client's admin sees this same list.</p>
          </div>
        </div>
        <div className={styles.cardBody}>
          {access.length === 0 ? (
            <p className={styles.muted}>Kayd has not accessed this organisation yet.</p>
          ) : (
            <ul className={styles.list}>
              {access.map((a) => (
                <li key={a.id}>
                  <span>
                    <strong>{a.staffName}</strong> {(ACCESS_ACTION_LABEL[a.action] ?? a.action).toLowerCase()}
                    {a.targetName ? `: ${a.targetName}` : ""}
                    {a.reason && <div className={styles.sub}>Reason: {a.reason}</div>}
                  </span>
                  <span className={styles.muted}>{formatDateTime(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
