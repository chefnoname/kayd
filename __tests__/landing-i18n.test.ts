import { describe, expect, it } from "vitest";
import {
  getDictionary,
  isLocale,
  resolveLocale,
} from "@/components/landing/i18n";
import { en } from "@/components/landing/dictionaries/en";
import { so } from "@/components/landing/dictionaries/so";

describe("resolveLocale", () => {
  it("defaults to English with no query or cookie", () => {
    expect(resolveLocale(undefined, undefined)).toBe("en");
  });

  it("uses the ?lang= query when valid", () => {
    expect(resolveLocale("so", undefined)).toBe("so");
  });

  it("prefers the query over the remembered cookie", () => {
    expect(resolveLocale("en", "so")).toBe("en");
  });

  it("falls back to the cookie when the query is missing or invalid", () => {
    expect(resolveLocale(undefined, "so")).toBe("so");
    expect(resolveLocale("fr", "so")).toBe("so");
  });

  it("takes the first value of a repeated query param", () => {
    expect(resolveLocale(["so", "en"], undefined)).toBe("so");
  });

  it("ignores junk cookie values", () => {
    expect(resolveLocale(undefined, "xx")).toBe("en");
  });
});

describe("isLocale", () => {
  it("accepts only supported locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("so")).toBe(true);
    expect(isLocale("SO")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});

/** Collect every leaf path so a missing Somali string fails loudly. */
function leafPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => leafPaths(item, `${prefix}[${i}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      leafPaths(child, prefix ? `${prefix}.${key}` : key)
    );
  }
  return [prefix];
}

describe("dictionaries", () => {
  it("Somali has the same shape as English", () => {
    expect(leafPaths(so)).toEqual(leafPaths(en));
  });

  it("has no empty Somali strings", () => {
    const empty = leafPaths(so).filter((path) => {
      const value = path
        .split(/\.|\[|\]/)
        .filter(Boolean)
        .reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], so);
      return typeof value !== "string" || value.trim() === "";
    });
    expect(empty).toEqual([]);
  });

  it("getDictionary returns the matching dictionary", () => {
    expect(getDictionary("so")).toBe(so);
    expect(getDictionary("en")).toBe(en);
  });
});
