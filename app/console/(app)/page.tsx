import Link from "next/link";
import { loadOrganisations } from "@/lib/console/queries";
import { formatDate, formatDateTime } from "@/lib/console/format";
import { OrgStatusPill } from "@/components/console/StatusPill";
import styles from "../console.module.css";

export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "trial", label: "Trial" },
  { value: "suspended", label: "Suspended" },
] as const;

export default async function OrganisationsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const all = await loadOrganisations();
  const status = FILTERS.some((f) => f.value === searchParams.status) ? searchParams.status ?? "" : "";
  const q = (searchParams.q ?? "").trim().toLowerCase();

  const count = (s: string) => (s ? all.filter((o) => o.status === s).length : all.length);
  const shown = all.filter(
    (o) =>
      (!status || o.status === status) &&
      (!q || o.name.toLowerCase().includes(q) || (o.adminName ?? "").toLowerCase().includes(q))
  );

  const href = (s: string) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    if (q) p.set("q", q);
    const qs = p.toString();
    return qs ? `/console?${qs}` : "/console";
  };

  return (
    <>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Organisations</h1>
          <p className={styles.lede}>Every client business using Kayd, with its people and locations.</p>
        </div>
        <form method="get" action="/console">
          {status && <input type="hidden" name="status" value={status} />}
          <label className={styles.field}>
            Search organisations
            <input
              className={styles.control}
              type="search"
              name="q"
              defaultValue={searchParams.q ?? ""}
              placeholder="Name or admin"
            />
          </label>
        </form>
      </header>

      <section aria-label="Summary" className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Active</div>
          <div className={styles.statValue}>{count("active")}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>On trial</div>
          <div className={styles.statValue}>{count("trial")}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Suspended</div>
          <div className={styles.statValue}>{count("suspended")}</div>
        </div>
      </section>

      <section aria-label="Organisations" className={styles.card}>
        <div className={styles.filterPills}>
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={href(f.value)}
              className={status === f.value ? styles.filterPillOn : styles.filterPill}
              aria-current={status === f.value ? "true" : undefined}
            >
              {f.label} · {count(f.value)}
            </Link>
          ))}
        </div>
        {shown.length === 0 ? (
          <p className={styles.empty}>No organisations match.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Organisation</th>
                  <th scope="col">Status</th>
                  <th scope="col" className={styles.num}>People</th>
                  <th scope="col" className={styles.num}>Locations</th>
                  <th scope="col">Last activity</th>
                  <th scope="col">Renewal</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((o) => (
                  <tr key={o.id} className={styles.clickRow}>
                    <td>
                      <Link className={styles.rowLink} href={`/console/organisations/${o.id}`}>
                        {o.name}
                      </Link>
                      <div className={styles.sub}>Admin: {o.adminName ?? "None"}</div>
                    </td>
                    <td><OrgStatusPill status={o.status} /></td>
                    <td className={styles.num}>{o.people}</td>
                    <td className={styles.num}>{o.locations}</td>
                    <td>{formatDateTime(o.lastActivity)}</td>
                    <td>
                      {o.status === "trial" && o.trialEndsOn
                        ? `Trial ends ${formatDate(o.trialEndsOn)}`
                        : o.renewsOn
                          ? formatDate(o.renewsOn)
                          : <span className={styles.muted}>Not set</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className={styles.footnote}>
        Money never appears on this page. Amounts are only shown in the activity log, after a reason is given.
      </p>
    </>
  );
}
