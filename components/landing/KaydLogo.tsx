import styles from "./KaydLogo.module.css";

type KaydLogoProps = {
  /** "dark" renders the wordmark in navy (light backgrounds), "light" in white. */
  tone?: "dark" | "light";
};

/** Vector recreation of the Kayd mark: gold notched block + navy chevron. */
export function KaydLogo({ tone = "dark" }: KaydLogoProps) {
  return (
    <span className={`${styles.logo} ${tone === "light" ? styles.light : ""}`}>
      <svg
        className={styles.mark}
        viewBox="0 0 205 200"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M0 0H107L14 100L107 200H0Z" fill="var(--kayd-gold)" />
        <path
          d="M152 0H204V57L160 100L204 147V200H152L59 100Z"
          fill="currentColor"
        />
      </svg>
      <span className={styles.word}>Kayd</span>
    </span>
  );
}
