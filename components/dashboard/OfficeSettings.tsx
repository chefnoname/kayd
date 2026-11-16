"use client";

import styles from "./OfficeSettings.module.css";

/** Settings that rarely change, kept quieter than the day's figures. */
export function OfficeSettings({ children }: { children: React.ReactNode }) {
  return (
    <section className={styles.card} aria-labelledby="office-settings-title">
      <h2 id="office-settings-title" className={styles.title}>
        Office settings
      </h2>
      <div>{children}</div>
    </section>
  );
}
