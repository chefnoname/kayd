/**
 * Epic C — Codebase cleanup verification tests.
 * Confirms all manual rate-entry UI has been fully removed.
 */
import { describe, test, expect } from "vitest";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = path.resolve(__dirname, "..");

function exists(rel: string) {
  return fs.existsSync(path.join(ROOT, rel));
}

function grepSrc(pattern: string): string {
  try {
    return execSync(
      `grep -r "${pattern}" "${ROOT}" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=__tests__ -l`,
      { encoding: "utf-8" }
    ).trim();
  } catch {
    return "";
  }
}

describe("Story 6 — Epic C codebase cleanup", () => {
  test("AC-1: /setup page file does not exist", () => {
    expect(exists("app/(dashboard)/setup/page.tsx")).toBe(false);
    expect(exists("app/(dashboard)/setup/setup.module.css")).toBe(false);
  });

  test("AC-2: DailyRateInput component does not exist", () => {
    expect(exists("components/setup/DailyRateInput.tsx")).toBe(false);
    expect(exists("components/setup/DailyRateInput.module.css")).toBe(false);
  });

  test("AC-2: RateHistoryStrip component does not exist", () => {
    expect(exists("components/setup/RateHistoryStrip.tsx")).toBe(false);
    expect(exists("components/setup/RateHistoryStrip.module.css")).toBe(false);
  });

  test("AC-3: no source file imports DailyRateInput", () => {
    expect(grepSrc("DailyRateInput")).toBe("");
  });

  test("AC-3: no source file imports RateHistoryStrip", () => {
    expect(grepSrc("RateHistoryStrip")).toBe("");
  });

  test("AC-3: no source file links to /setup", () => {
    expect(grepSrc('href.*["\x27]/setup["\x27]')).toBe("");
  });

  test("AC-4: middleware does not redirect to /setup", () => {
    const middleware = fs.readFileSync(
      path.join(ROOT, "middleware.ts"),
      "utf-8"
    );
    expect(middleware).not.toContain("/setup");
  });

  test("AC-5: Sidebar nav does not include a Setup entry", () => {
    const sidebar = fs.readFileSync(
      path.join(ROOT, "components/layout/Sidebar.tsx"),
      "utf-8"
    );
    expect(sidebar).not.toContain("/setup");
    expect(sidebar).not.toContain('"Setup"');
  });

  test("AC-6: tour.ts has been removed entirely", () => {
    expect(exists("lib/tour.ts")).toBe(false);
  });
});
