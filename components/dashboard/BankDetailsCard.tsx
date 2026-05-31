"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import styles from "./BankDetailsCard.module.css";

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
  const [editing, setEditing] = useState(false);
  const [draftBank, setDraftBank] = useState(bankName ?? "");
  const [draftSort, setDraftSort] = useState(sortCode ?? "");
  const [draftAccount, setDraftAccount] = useState(accountNumber ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const allNull = !bankName && !sortCode && !accountNumber;

  function startEdit() {
    setDraftBank(bankName ?? "");
    setDraftSort(sortCode ?? "");
    setDraftAccount(accountNumber ?? "");
    setError(null);
    setSuccess(false);
    setEditing(true);
  }

  async function save() {
    setError(null);
    setSuccess(false);
    setSaving(true);

    let result: Response;
    try {
      result = await fetch("/api/org/bank-details", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_name: draftBank.trim() || null,
          sort_code: draftSort.trim() || null,
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
    setSuccess(true);
    setEditing(false);
    onSaved(saved);
  }

  return (
    <Card>
      <CardHeader className={styles.header}>
        <CardTitle className={styles.label}>Bank Details</CardTitle>
        {editable && !editing && (
          <Button
            variant="ghost"
            size="icon"
            onClick={startEdit}
            aria-label="Edit bank details"
            className={styles.editBtn}
          >
            <Pencil size={14} />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className={styles.editFields}>
            <div className={styles.editField}>
              <label htmlFor="bank-name">Bank Name</label>
              <Input
                id="bank-name"
                value={draftBank}
                onChange={(e) => setDraftBank(e.target.value)}
                placeholder="e.g. Barclays"
                className={styles.input}
                autoFocus
              />
            </div>
            <div className={styles.editField}>
              <label htmlFor="sort-code">Sort Code</label>
              <Input
                id="sort-code"
                value={draftSort}
                onChange={(e) => setDraftSort(e.target.value)}
                placeholder="e.g. 20-45-12"
                className={styles.input}
              />
            </div>
            <div className={styles.editField}>
              <label htmlFor="account-number">Account Number</label>
              <Input
                id="account-number"
                value={draftAccount}
                onChange={(e) => setDraftAccount(e.target.value)}
                placeholder="e.g. 12345678"
                className={styles.input}
              />
            </div>
            <div className={styles.editActions}>
              <Button size="icon" onClick={save} disabled={saving} aria-label="Save">
                <Check size={14} />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setError(null);
                }}
                disabled={saving}
                aria-label="Cancel"
              >
                <X size={14} />
              </Button>
            </div>
          </div>
        ) : allNull ? (
          <div className={styles.notConfigured}>Not configured</div>
        ) : (
          <div className={styles.rows}>
            <div className={styles.fieldRow}>
              <span className={styles.fieldLabel}>Bank Name</span>
              <span className={styles.fieldValue}>{bankName ?? "—"}</span>
            </div>
            <div className={styles.fieldRow}>
              <span className={styles.fieldLabel}>Sort Code</span>
              <span className={styles.fieldValue}>{sortCode ?? "—"}</span>
            </div>
            <div className={styles.fieldRow}>
              <span className={styles.fieldLabel}>Account Number</span>
              <span className={styles.fieldValue}>{accountNumber ?? "—"}</span>
            </div>
          </div>
        )}
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>Bank details saved.</div>}
      </CardContent>
    </Card>
  );
}
