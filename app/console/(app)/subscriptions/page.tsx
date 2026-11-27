import Link from "next/link";
import { loadOrganisations } from "@/lib/console/queries";
import { formatDate } from "@/lib/console/format";
import { OrgStatusPill } from "@/components/console/StatusPill";
import { SubscriptionEditor } from "@/components/console/SubscriptionEditor";
import styles from "../../console.module.css";

export const dynamic = "force-dynamic";

function daysUntil(day: string | null): number | null {
  if (!day) return null;
  const ms = new Date(`${day}T00:00:00Z`).getTime() - new Date(new Date().toISOString().slice(0, 10)).getTime();
  return Math.round(ms / 86_400_000);
}

export default async function SubscriptionsPage() {
  const orgs = await loadOrganisations();
  const rows = orgs
    .map((o) => {
      const due = o.status === "trial" ? o.trialEndsOn : o.renewsOn;
      return { ...o, due, inDays: daysUntil(due) };
    })
    .sort((a, b) => (a.inDays ?? 1e9) - (b.inDays ?? 1e9));
  const soon = rows.filter((r) => r.inDays !== null && r.inDays <= 14 && r.status !== "suspended");

  return (
    <>
      <header className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Subscriptions</h1>
            <span className={styles.pillInfo}>Manual for now</span>
          </div>
          <p className={styles.lede}>
            Plans and renewal dates are typed in by hand until billing is connected. Soonest renewal first.
          </p>
        </div>
      </header>

      {soon.length > 0 && (
        <div role="status" className={styles.noticeWarn}>
          <strong>{soon.length} due in the next 14 days:</strong> {soon.map((s) => s.name).join(", ")}.
        </div>
      )}

      <section className={styles.card} aria-label="Subscriptions">
        {rows.length === 0 ? (
          <p className={styles.empty}>No organisations yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Organisation</th>
                  <th scope="col">Status</th>
                  <th scope="col">Plan</th>
                  <th scope="col" className={styles.num}>Per month</th>
                  <th scope="col">Renews / trial ends</th>
                  <th scope="col"><span className={styles.muted}>Edit</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/console/organisations/${o.id}`}>{o.name}</Link>
                    </td>
                    <td><OrgStatusPill status={o.status} /></td>
                    <td>{o.plan ?? <span className={styles.muted}>Not set</span>}</td>
                    <td className={styles.num}>
                      {o.priceGbpMonthly !== null ? `£${o.priceGbpMonthly.toFixed(2)}` : <span className={styles.muted}>Not set</span>}
                    </td>
                    <td>
                      {o.due ? (
                        <>
                          {formatDate(o.due)}
                          {o.inDays !== null && (
                            <div className={styles.sub}>
                              {o.inDays < 0 ? `${-o.inDays} days overdue` : o.inDays === 0 ? "Today" : `In ${o.inDays} days`}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className={styles.muted}>Not set</span>
                      )}
                    </td>
                    <td>
                      <SubscriptionEditor
                        value={{
                          organisationId: o.id,
                          name: o.name,
                          status: o.status,
                          plan: o.plan,
                          priceGbpMonthly: o.priceGbpMonthly,
                          renewsOn: o.renewsOn,
                          trialEndsOn: o.trialEndsOn,
                        }}
                      />
                    </td>
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
