"use client";

import { useEffect, useState } from "react";
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
import { formatCurrency } from "@/lib/utils";
import styles from "./EditableStatCard.module.css";

interface EditableStatCardProps {
  label: string;
  value: number;
  currency: "GBP" | "USD";
  editable?: boolean;
  onSave?: (next: number) => Promise<void> | void;
}

export function EditableStatCard({
  label,
  value,
  currency,
  editable = false,
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
      <Card className={styles.card}>
        <CardHeader className={styles.header}>
          <CardTitle className={styles.label}>{label}</CardTitle>
          {editable && (
            <Button
              variant="ghost"
              size="icon"
              onClick={openDialog}
              aria-label={`Edit ${label}`}
              className={styles.editBtn}
            >
              <Pencil size={14} />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className={styles.value}>{formatCurrency(value, currency)}</div>
        </CardContent>
      </Card>

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
