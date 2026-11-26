import styles from "@/app/console/console.module.css";

export function OrgStatusPill({ status }: { status: "active" | "trial" | "suspended" }) {
  if (status === "suspended") return <span className={styles.pillBad}>Suspended</span>;
  if (status === "trial") return <span className={styles.pillWarn}>Trial</span>;
  return <span className={styles.pillOk}>Active</span>;
}

/** Status of one person: locked, inactive for a while, or active. */
export function PersonStatusPill({
  lockedAt,
  inactiveDays,
}: {
  lockedAt: string | null;
  inactiveDays: number | null;
}) {
  if (lockedAt) return <span className={styles.pillBad}>Locked</span>;
  if (inactiveDays === null) return <span className={styles.pillInfo}>Never signed in</span>;
  if (inactiveDays >= 14) return <span className={styles.pillWarn}>Inactive {inactiveDays} days</span>;
  return <span className={styles.pillOk}>Active</span>;
}
