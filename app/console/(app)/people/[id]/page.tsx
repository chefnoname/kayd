import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { loadActivity } from "@/lib/console/queries";
import { daysAgo, formatDate, formatDateTime } from "@/lib/console/format";
import { PersonStatusPill } from "@/components/console/StatusPill";
import { PersonActions } from "@/components/console/PersonActions";
import styles from "../../../console.module.css";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PersonPage({ params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) notFound();
  const admin = createAdminClient();

  const { data: person } = await admin
    .from("staff_users")
    .select("id, name, email, role, organisation_id, created_at, last_active_at, locked_at, locked_reason")
    .eq("id", params.id)
    .maybeSingle();
  if (!person) notFound();

  const [{ data: org }, activity] = await Promise.all([
    admin.from("organisations").select("id, name").eq("id", person.organisation_id).maybeSingle(),
    loadActivity(
      { org: person.organisation_id, person: person.id, type: null, from: null, to: null },
      false,
      15
    ),
  ]);

  return (
    <>
      <Link href={`/console/organisations/${person.organisation_id}`} className={styles.back}>
        ← {org?.name ?? "Organisation"}
      </Link>
      <header className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{person.name}</h1>
            <PersonStatusPill lockedAt={person.locked_at} inactiveDays={daysAgo(person.last_active_at)} />
          </div>
          <p className={styles.lede}>
            {person.role === "admin" ? "Admin" : "Staff"} at {org?.name ?? "an organisation"} · {person.email}
          </p>
        </div>
      </header>

      {person.locked_at && (
        <div role="status" className={styles.noticeBad}>
          <strong>Locked {formatDateTime(person.locked_at)}.</strong> Reason: {person.locked_reason ?? "None given"}.
        </div>
      )}

      <div className={styles.grid2}>
        <section className={styles.card} aria-labelledby="details-h">
          <div className={styles.cardHead}>
            <h2 id="details-h" className={styles.cardTitle}>Details</h2>
          </div>
          <div className={styles.cardBody}>
            <dl className={styles.dl}>
              <dt>Email</dt>
              <dd>{person.email}</dd>
              <dt>Role</dt>
              <dd>{person.role === "admin" ? "Admin" : "Staff"}</dd>
              <dt>Added</dt>
              <dd>{formatDate(person.created_at)}</dd>
              <dt>Last sign-in</dt>
              <dd>{formatDateTime(person.last_active_at)}</dd>
            </dl>
          </div>
        </section>

        <section className={styles.card} aria-labelledby="access-h">
          <div className={styles.cardHead}>
            <h2 id="access-h" className={styles.cardTitle}>Access</h2>
          </div>
          <div className={styles.cardBody}>
            <PersonActions
              userId={person.id}
              name={person.name}
              email={person.email}
              locked={Boolean(person.locked_at)}
            />
          </div>
        </section>
      </div>

      <section className={styles.card} aria-labelledby="recent-h">
        <div className={styles.cardHead}>
          <div>
            <h2 id="recent-h" className={styles.cardTitle}>Recent activity</h2>
            <p className={styles.cardNote}>Amounts are hidden. Open the full log to see them with a reason.</p>
          </div>
          <Link href={`/console/activity?org=${person.organisation_id}&person=${person.id}`} className={styles.back}>
            Full activity log →
          </Link>
        </div>
        {activity.length === 0 ? (
          <p className={styles.empty}>Nothing recorded yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">What</th>
                  <th scope="col">Detail</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((a) => (
                  <tr key={a.id}>
                    <td className={styles.wrap}>{formatDateTime(a.createdAt)}</td>
                    <td>{a.label}</td>
                    <td>{a.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
