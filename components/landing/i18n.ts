import { en } from "./dictionaries/en";
import { so } from "./dictionaries/so";
import type { LandingDictionary, Locale } from "./types";

export const LOCALES: readonly Locale[] = ["en", "so"];
export const DEFAULT_LOCALE: Locale = "en";

/** Cookie that remembers the visitor's last language choice. */
export const LANG_COOKIE = "kayd_lang";

const DICTIONARIES: Record<Locale, LandingDictionary> = { en, so };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Pick the landing-page language: an explicit `?lang=` wins, then the
 * remembered cookie, then English.
 */
export function resolveLocale(
  queryLang: string | string[] | undefined,
  cookieLang: string | undefined
): Locale {
  const fromQuery = Array.isArray(queryLang) ? queryLang[0] : queryLang;
  if (isLocale(fromQuery)) return fromQuery;
  if (isLocale(cookieLang)) return cookieLang;
  return DEFAULT_LOCALE;
}

export function getDictionary(locale: Locale): LandingDictionary {
  return DICTIONARIES[locale];
}
