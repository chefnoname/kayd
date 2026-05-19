"use client";

import { useEffect, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  async function commit() {
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
      setEditing(false);
    } catch (e: any) {
      setError(e?.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className={styles.header}>
        <CardTitle className={styles.label}>{label}</CardTitle>
        {editable && !editing && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${label}`}
            className={styles.editBtn}
          >
            <Pencil size={14} />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className={styles.editRow}>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              className={styles.input}
            />
            <Button
              size="icon"
              onClick={commit}
              disabled={saving}
              aria-label="Save"
            >
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
        ) : (
          <div className={styles.value}>{formatCurrency(value, currency)}</div>
        )}
        {error && <div className={styles.error}>{error}</div>}
      </CardContent>
    </Card>
  );
}
