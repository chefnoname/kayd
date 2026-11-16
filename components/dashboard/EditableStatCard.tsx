"use client";

import { useEffect, useState } from "react";
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
import { formatCurrency } from "@/lib/utils";
import styles from "./EditableStatCard.module.css";

interface EditableStatCardProps {
  label: string;
  value: number;
  currency: "GBP" | "USD";
  editable?: boolean;
  /** "hero" = the leading night-blue figure; "row" = a quiet label/value line. */
  variant: "hero" | "row";
  /** Supporting line under a hero figure. */
  note?: React.ReactNode;
  onSave?: (next: number) => Promise<void> | void;
}

export function EditableStatCard({
  label,
  value,
  currency,
  editable = false,
  variant,
  note,
  onSave,
}: EditableStatCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setDraft(String(value));
    setError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    if (saving) return;
    setDialogOpen(false);
    setError(null);
  }

  async function commit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const next = Number(draft);
    if (!Number.isFinite(next) || next < 0) {
      setError("Must be 0 or greater.");
      return;
    }
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(next);
      setDialogOpen(false);
    } catch (err: any) {
      setError(err?.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {variant === "hero" ? (
        <div className={styles.hero}>
          <div className={styles.heroTop}>
            <span className={styles.heroLabel}>{label}</span>
            {editable && (
              <button
                type="button"
                onClick={openDialog}
                aria-label={`Update ${label}`}
                className={styles.heroBtn}
              >
                Update
              </button>
            )}
          </div>
          <span className={styles.heroValue}>
            {formatCurrency(value, currency)}
          </span>
          {note && <span className={styles.heroNote}>{note}</span>}
        </div>
      ) : (
        <div className={styles.row}>
          <span className={styles.rowLabel}>{label}</span>
          <span className={styles.rowValue}>
            {formatCurrency(value, currency)}
            {editable && (
              <button
                type="button"
                onClick={openDialog}
                aria-label={`Edit ${label}`}
                className={styles.rowBtn}
              >
                Edit
              </button>
            )}
          </span>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {label}</DialogTitle>
          </DialogHeader>
          <form onSubmit={commit}>
            <div className={styles.dialogField}>
              <Label htmlFor={`edit-${label}`}>{label} ({currency})</Label>
              <Input
                id={`edit-${label}`}
                type="number"
                min="0"
                step="0.01"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={() => { if (draft === "0") setDraft(""); }}
                onBlur={() => { if (draft === "") setDraft("0"); }}
                autoFocus
                className={styles.input}
              />
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
