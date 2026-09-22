"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "./types";
import styles from "./LanguageToggle.module.css";

const OPTIONS: { locale: Locale; short: string; name: string }[] = [
  { locale: "en", short: "EN", name: "English" },
  { locale: "so", short: "SO", name: "Soomaali" },
];

type LanguageToggleProps = {
  locale: Locale;
  label: string;
};

/**
 * Radio group that flips instantly, then re-renders the server page in the
 * chosen language without a full reload or scroll jump. Middleware stores the
 * choice in a cookie. Without JS, the GET form + noscript button still work.
 */
export function LanguageToggle({ locale, label }: LanguageToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [requested, setRequested] = useState<Locale>(locale);

  // While the new page is loading, show the visitor's pick; otherwise trust the server.
  const selected = isPending ? requested : locale;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value as Locale;
    setRequested(next);
    startTransition(() => {
      router.replace(`/home?lang=${next}`, { scroll: false });
    });
  }

  return (
    <form action="/home" method="get" className={styles.form}>
      <fieldset
        className={styles.group}
        aria-busy={isPending || undefined}
      >
        <legend className={styles.legend}>{label}</legend>
        {OPTIONS.map((option) => (
          <label key={option.locale} className={styles.option} lang={option.locale}>
            <input
              type="radio"
              name="lang"
              value={option.locale}
              checked={selected === option.locale}
              onChange={handleChange}
              aria-label={option.name}
              className={styles.input}
            />
            <span className={styles.radio} aria-hidden="true" />
            <span className={styles.full} aria-hidden="true">
              {option.name}
            </span>
            <span className={styles.short} aria-hidden="true">
              {option.short}
            </span>
          </label>
        ))}
      </fieldset>
      <noscript>
        <button type="submit" className={styles.submit}>
          OK
        </button>
      </noscript>
    </form>
  );
}
