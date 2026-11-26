import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { amountGrantUntil, getConsoleStaff } from "@/lib/console/server";
import { loadActivity, parseActivityFilters } from "@/lib/console/queries";
import { ACTIVITY_TYPES } from "@/lib/console/activity";
import { formatDateTime } from "@/lib/console/format";
import { BreakGlass } from "@/components/console/BreakGlass";
import { Button } from "@/components/ui/button";
import styles from "../../console.module.css";

export const dynamic = "force-dynamic";

const TONE_CLASS = {
  money: styles.pillOk,
  edit: styles.pillWarn,
  delete: styles.pillBad,
  neutral: styles.pillInfo,
} as const;

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const staff = await getConsoleStaff();
  if (!staff) redirect("/console/login?denied=1");

  const filters = parseActivityFilters(searchParams);
  const admin = createAdminClient();

  const [{ data: orgs }, { data: people }, grantUntil] = await Promise.all([
    admin.from("organisations").select("id, name").order("name"),
    filters.org
      ? admin.from("staff_users").select("id, name").eq("organisation_id", filters.org).order("name")
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    filters.org ? amountGrantUntil(staff.id, filters.org) : Promise.resolve(null),
  ]);

  const showAmounts = Boolean(grantUntil);
  const lines = await loadActivity(filters, showAmounts);
  const org = (orgs ?? []).find((o) => o.id === filters.org);

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) qs.set(k, v);
  const exportHref = `/api/console/activity/export${qs.toString() ? `?${qs}` : ""}`;

  return (
    <>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Activity log</h1>
          <p className={styles.lede}>
            Who did what, and when, across every organisation. The log can&apos;t be edited or deleted.
          </p>
        </div>
        <div className={styles.actions}>
          {org && !showAmounts && <BreakGlass organisationId={org.id} orgName={org.name} />}
          <a href={exportHref} className={styles.linkButton} download>
            Export CSV
          </a>
        </div>
      </header>

      {showAmounts && org ? (
        <div role="status" className={styles.noticeWarn}>
          <strong>Amounts are visible for {org.name}</strong> until {formatDateTime(grantUntil)}. This was logged and the
          client&apos;s admin can see it.
        </div>
      ) : (
        <div role="status" className={styles.noticeInfo}>
          Amounts are hidden.{" "}
          {org
            ? "Use Show amounts and give a reason to see them for 15 minutes."
            : "Pick one organisation to be able to show amounts."}
        </div>
      )}

      <form method="get" action="/console/activity" className={styles.filters}>
        <label className={styles.field}>
          Organisation
          <select name="org" defaultValue={filters.org ?? ""} className={styles.control}>
            <option value="">All organisations</option>
            {(orgs ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Person
          <select
            name="person"
            defaultValue={filters.person ?? ""}
            className={styles.control}
            disabled={!filters.org}
          >
            <option value="">{filters.org ? "Everyone" : "Pick an organisation first"}</option>
            {(people ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Type
          <select name="type" defaultValue={filters.type ?? ""} className={styles.control}>
            <option value="">Everything</option>
            {ACTIVITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          From
          <input type="date" name="from" defaultValue={filters.from ?? ""} className={styles.control} />
        </label>
        <label className={styles.field}>
          To
          <input type="date" name="to" defaultValue={filters.to ?? ""} className={styles.control} />
        </label>
        <Button type="submit">Apply</Button>
        {qs.toString() && (
          <Link href="/console/activity" className={styles.back}>
            Clear
          </Link>
        )}
      </form>

      <section className={styles.card} aria-label="Activity">
        {lines.length === 0 ? (
          <p className={styles.empty}>Nothing matches these filters.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  {!filters.org && <th scope="col">Organisation</th>}
                  <th scope="col">Person</th>
                  <th scope="col">What</th>
                  <th scope="col">Detail</th>
                  <th scope="col" className={styles.num}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id}>
                    <td className={styles.wrap}>{formatDateTime(l.createdAt)}</td>
                    {!filters.org && <td>{l.organisationName}</td>}
                    <td>{l.actorName}</td>
                    <td>
                      <span className={TONE_CLASS[l.tone]}>{l.label}</span>
                    </td>
                    <td>{l.detail}</td>
                    <td className={styles.num}>
                      {l.amount ??
                        (!showAmounts && l.tone === "money" ? <span className={styles.muted}>Hidden</span> : "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className={styles.footnote}>Showing the latest {lines.length} entries. Narrow the filters or export to see more.</p>
    </>
  );
}
