"use client";

import Link from "next/link";
import { useAtomValue } from "jotai";
import { attentionAtom } from "@/lib/atoms";
import { UNCOLLECTED_BALANCE_THRESHOLD } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { Pill } from "@/components/shared/Pill";
import styles from "./NeedsAttention.module.css";

/**
 * What needs action today: agents over the uncollected-balance limit and
 * offices overdue a collection. Reads the shared attention state so it
 * always agrees with the sidebar badges.
 */
export function NeedsAttention() {
  const { highBalanceAgents, overdueOffices, loaded } =
    useAtomValue(attentionAtom);
  const total = highBalanceAgents.length + overdueOffices.length;
  const limit = formatCurrency(UNCOLLECTED_BALANCE_THRESHOLD, "USD").replace(
    /\.00$/,
    ""
  );

  return (
    <section className={styles.card} aria-labelledby="needs-attention-title">
      <div className={styles.head}>
        <h2 id="needs-attention-title" className={styles.title}>
          Needs attention
        </h2>
        {total > 0 && (
          <span className={styles.count}>
            {total} item{total === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {total === 0 ? (
        <p className={styles.empty}>
          {loaded
            ? "Nothing needs attention. No agent is over the balance limit and no office is overdue a collection."
            : "Checking agents and offices…"}
        </p>
      ) : (
        <ul className={styles.list}>
          {highBalanceAgents.map((a) => (
            <li key={`a-${a.id}`} className={styles.item}>
              <Pill tone="danger">High balance</Pill>
              <span className={styles.text}>
                <strong>{a.name}</strong> owes{" "}
                <strong className={styles.figure}>
                  {formatCurrency(a.balance_usd, "USD")}
                </strong>
                , over the {limit} limit
              </span>
              <Link href="/agent-deposits" className={styles.action}>
                Record deposit
                <span className={styles.srOnly}> for {a.name}</span>
              </Link>
            </li>
          ))}
          {overdueOffices.map((o) => (
            <li key={`o-${o.id}`} className={styles.item}>
              <Pill tone="danger">Overdue</Pill>
              <span className={styles.text}>
                <strong>{o.name}</strong>
                {o.days === null ? (
                  " has no collections logged yet"
                ) : (
                  <>
                    {" "}
                    holds{" "}
                    <strong className={styles.figure}>
                      {formatCurrency(o.cash_held_gbp, "GBP")}
                    </strong>
                    , {o.days} days since last collection
                  </>
                )}
              </span>
              <Link href="/locations" className={styles.action}>
                Log collection
                <span className={styles.srOnly}> for {o.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
