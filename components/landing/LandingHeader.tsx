import Link from "next/link";
import { KaydLogo } from "./KaydLogo";
import { LanguageToggle } from "./LanguageToggle";
import type { LandingDictionary, Locale } from "./types";
import styles from "./LandingHeader.module.css";

type LandingHeaderProps = {
  calendlyUrl: string;
  locale: Locale;
  t: LandingDictionary["nav"];
};

export function LandingHeader({ calendlyUrl, locale, t }: LandingHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/home" className={styles.brand} aria-label="Kayd home">
          <KaydLogo />
        </Link>

        <nav className={styles.nav} aria-label="Main">
          <a href="#kayd-original" className={styles.navLink}>
            {t.kaydOriginal}
          </a>
          <a href="#what-we-build" className={styles.navLink}>
            {t.whatWeBuild}
          </a>
          <a href="#how-it-works" className={styles.navLink}>
            {t.howItWorks}
          </a>
        </nav>

        <div className={styles.actions}>
          <LanguageToggle locale={locale} label={t.languageLabel} />
          <a
            href={calendlyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.callLink}
          >
            {t.bookCall}
          </a>
          <Link href="/login" className={styles.login}>
            {t.logIn}
          </Link>
        </div>
      </div>
    </header>
  );
}
