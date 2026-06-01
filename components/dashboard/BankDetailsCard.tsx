"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import styles from "./BankDetailsCard.module.css";

// ---------------------------------------------------------------------------
// Country configuration
// ---------------------------------------------------------------------------

type CountryCode = "GB" | "AU" | "CA" | "US" | "OTHER";

interface CountryConfig {
  name: string;
  /** null = no routing field shown for this country */
  routingLabel: string | null;
  routingPlaceholder: string;
  /** max raw digits allowed (before formatting) */
  routingMaxRaw: number;
  accountLabel: string;
  accountPlaceholder: string;
  /** Max character length for the account number field (undefined = no limit) */
  accountMaxLength?: number;
  /** Insert dashes / formatting as the user types */
  formatRouting: (raw: string) => string;
}

const COUNTRIES: Record<CountryCode, CountryConfig> = {
  GB: {
    name: "United Kingdom",
    routingLabel: "Sort Code",
    routingPlaceholder: "11-22-33",
    routingMaxRaw: 6,
    accountLabel: "Account Number",
    accountPlaceholder: "12345678",
    accountMaxLength: 8,
    formatRouting: (raw) => {
      const d = raw.replace(/\D/g, "").slice(0, 6);
      if (d.length <= 2) return d;
      if (d.length <= 4) return `${d.slice(0, 2)}-${d.slice(2)}`;
      return `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4)}`;
    },
  },
  AU: {
    name: "Australia",
    routingLabel: "BSB",
    routingPlaceholder: "123-456",
    routingMaxRaw: 6,
    accountLabel: "Account Number",
    accountPlaceholder: "123456789",
    formatRouting: (raw) => {
      const d = raw.replace(/\D/g, "").slice(0, 6);
      if (d.length <= 3) return d;
      return `${d.slice(0, 3)}-${d.slice(3)}`;
    },
  },
  CA: {
    name: "Canada",
    routingLabel: "Transit Number",
    routingPlaceholder: "XXXXX",
    routingMaxRaw: 5,
    accountLabel: "Account Number",
    accountPlaceholder: "XXXXXXX",
    formatRouting: (raw) => raw.replace(/\D/g, "").slice(0, 5),
  },
  US: {
    name: "United States",
    routingLabel: "Routing Number",
    routingPlaceholder: "XXXXXXXXX",
    routingMaxRaw: 9,
    accountLabel: "Account Number",
    accountPlaceholder: "XXXXXXXXXXXX",
    formatRouting: (raw) => raw.replace(/\D/g, "").slice(0, 9),
  },
  OTHER: {
    name: "Other / International",
    routingLabel: "IBAN / Branch Code",
    routingPlaceholder: "e.g. GB29NWBK60161331926819",
    routingMaxRaw: 34,
    accountLabel: "BIC / SWIFT",
    accountPlaceholder: "e.g. NWBKGB2L",
    formatRouting: (raw) => raw.toUpperCase(),
  },
};

const COUNTRY_ORDER: CountryCode[] = ["GB", "AU", "CA", "US", "OTHER"];

/** Infer country from a stored sort_code value so the card label is correct. */
function detectCountry(sortCode: string | null): CountryCode {
  if (!sortCode) return "GB";
  if (/^\d{2}-\d{2}-\d{2}$/.test(sortCode)) return "GB";
  if (/^\d{3}-\d{3}$/.test(sortCode)) return "AU";
  const digits = sortCode.replace(/\D/g, "");
  if (/^\d{5}$/.test(digits)) return "CA";
  if (/^\d{9}$/.test(digits)) return "US";
  if (/^[A-Z]{2}\d{2}/i.test(sortCode)) return "OTHER"; // IBAN pattern
  return "OTHER";
}

interface BankDetailsCardProps {
  bankName: string | null;
  sortCode: string | null;
  accountNumber: string | null;
  editable: boolean;
  orgId: string;
  onSaved: (data: { bank_name: string | null; sort_code: string | null; account_number: string | null }) => void;
}

export function BankDetailsCard({
  bankName,
  sortCode,
  accountNumber,
  editable,
  orgId,
  onSaved,
}: BankDetailsCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [country, setCountry] = useState<CountryCode>("GB");
  const [draftBank, setDraftBank] = useState("");
  const [draftRouting, setDraftRouting] = useState("");
  const [draftAccount, setDraftAccount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allNull = !bankName && !sortCode && !accountNumber;
  const detectedCountry = detectCountry(sortCode);
  const displayConfig = COUNTRIES[detectedCountry];

  function openDialog() {
    const detected = detectCountry(sortCode);
    setCountry(detected);
    setDraftBank(bankName ?? "");
    setDraftRouting(sortCode ?? "");
    setDraftAccount(accountNumber ?? "");
    setError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    if (saving) return;
    setDialogOpen(false);
    setError(null);
  }

  function handleCountryChange(next: CountryCode) {
    setCountry(next);
    // Reset routing when switching countries so stale formats don't carry over
    setDraftRouting("");
  }

  function handleRoutingChange(raw: string) {
    const cfg = COUNTRIES[country];
    setDraftRouting(cfg.formatRouting(raw));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const cfg = COUNTRIES[country];

    let result: Response;
    try {
      result = await fetch("/api/org/bank-details", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_name: draftBank.trim() || null,
          sort_code: cfg.routingLabel ? (draftRouting.trim() || null) : null,
          account_number: draftAccount.trim() || null,
        }),
      });
    } catch {
      setSaving(false);
      setError("Network error — please try again.");
      return;
    }

    setSaving(false);

    if (!result.ok) {
      const body = await result.json().catch(() => ({}));
      setError((body as { error?: string }).error ?? "Failed to save bank details.");
      return;
    }

    const saved = await result.json();
    setDialogOpen(false);
    onSaved(saved);
  }

  return (
    <>
      <Card className={styles.card}>
        <CardHeader className={styles.header}>
          <CardTitle className={styles.label}>Bank Details</CardTitle>
          {editable && (
            <Button
              variant="ghost"
              size="icon"
              onClick={openDialog}
              aria-label="Edit bank details"
              className={styles.editBtn}
            >
              <Pencil size={14} />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {allNull ? (
            <div className={styles.notConfigured}>Not configured</div>
          ) : (
            <div className={styles.rows}>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Bank Name</span>
                <span className={styles.fieldValue}>{bankName ?? "—"}</span>
              </div>
              {sortCode && (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>{displayConfig.routingLabel ?? "Routing"}</span>
                  <span className={styles.fieldValue}>{sortCode}</span>
                </div>
              )}
              {accountNumber && (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>{displayConfig.accountLabel}</span>
                  <span className={styles.fieldValue}>{accountNumber}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bank Details</DialogTitle>
          </DialogHeader>
          <form onSubmit={save}>
            <div className={styles.editFields}>
              {/* Country picker */}
              <div className={styles.editField}>
                <Label htmlFor="bank-country">Country</Label>
                <select
                  id="bank-country"
                  value={country}
                  onChange={(e) => handleCountryChange(e.target.value as CountryCode)}
                  className={styles.countrySelect}
                >
                  {COUNTRY_ORDER.map((code) => (
                    <option key={code} value={code}>
                      {COUNTRIES[code].name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bank name — always shown */}
              <div className={styles.editField}>
                <Label htmlFor="bank-name">Bank Name</Label>
                <Input
                  id="bank-name"
                  value={draftBank}
                  onChange={(e) => setDraftBank(e.target.value)}
                  placeholder="e.g. Barclays"
                  className={styles.input}
                  autoFocus
                />
              </div>

              {/* Routing / branch identifier — country-specific */}
              {COUNTRIES[country].routingLabel && (
                <div className={styles.editField}>
                  <Label htmlFor="routing">{COUNTRIES[country].routingLabel}</Label>
                  <Input
                    id="routing"
                    value={draftRouting}
                    onChange={(e) => handleRoutingChange(e.target.value)}
                    placeholder={COUNTRIES[country].routingPlaceholder}
                    className={styles.input}
                    inputMode="numeric"
                  />
                </div>
              )}

              {/* Account number — country-specific label */}
              <div className={styles.editField}>
                <Label htmlFor="account-number">{COUNTRIES[country].accountLabel}</Label>
                <Input
                  id="account-number"
                  value={draftAccount}
                  onChange={(e) => setDraftAccount(e.target.value)}
                  placeholder={COUNTRIES[country].accountPlaceholder}
                  maxLength={COUNTRIES[country].accountMaxLength}
                  className={styles.input}
                />
              </div>

              {error && <div className={styles.error}>{error}</div>}
            </div>
            <DialogFooter className={styles.dialogFooter}>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
