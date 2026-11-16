import styles from "./Pill.module.css";

export type PillTone = "success" | "warning" | "danger" | "info";

/**
 * Small status label. Text never wraps or overflows: a pill keeps its
 * natural width and the content beside it gives way instead.
 */
export function Pill({
  tone,
  dot = false,
  children,
  ...rest
}: {
  tone: PillTone;
  dot?: boolean;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={`${styles.pill} ${styles[tone]}`} {...rest}>
      {dot && <span className={styles.dot} aria-hidden />}
      {children}
    </span>
  );
}
