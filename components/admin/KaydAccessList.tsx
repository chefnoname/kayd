"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { ACCESS_ACTION_LABEL } from "@/lib/console/activity";
import { formatDateTime } from "@/lib/console/format";
import styles from "./KaydAccessList.module.css";

type Row = {
  id: number;
  staff_name: string;
  action: string;
  target_name: string | null;
  reason: string | null;
  created_at: string;
};

/**
 * Every time Kayd staff looked at or changed this organisation from the
 * console. Row-level security only lets this organisation's admins read it.
 */
export function KaydAccessList() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    createClient()
      .from("kayd_access_log")
      .select("id, staff_name, action, target_name, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error: e }) => {
        if (e) setError(true);
        else setRows((data ?? []) as Row[]);
      });
  }, []);

  return (
    <section className={styles.card} aria-labelledby="kayd-access-h">
      <div className={styles.head}>
        <h2 id="kayd-access-h" className={styles.title}>
          Kayd access
        </h2>
        <p className={styles.note}>
          Every time someone at Kayd opened money amounts, exported your activity or changed an account here, with
          their reason.
        </p>
      </div>
      {error ? (
        <p className={styles.empty}>This list could not be loaded.</p>
      ) : rows === null ? (
        <p className={styles.empty}>Loading…</p>
      ) : rows.length === 0 ? (
        <p className={styles.empty}>Kayd has not accessed your organisation.</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((r) => (
            <li key={r.id} className={styles.item}>
              <div>
                <strong>{r.staff_name}</strong> (Kayd){" "}
                {(ACCESS_ACTION_LABEL[r.action] ?? r.action).toLowerCase()}
                {r.target_name ? `: ${r.target_name}` : ""}
                {r.reason && <div className={styles.reason}>Reason: {r.reason}</div>}
              </div>
              <time className={styles.when} dateTime={r.created_at}>
                {formatDateTime(r.created_at)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
