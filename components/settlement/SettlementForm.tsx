"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AgentSelector } from "./AgentSelector";
import type { SettlementAgent } from "./types";
import styles from "./SettlementForm.module.css";

export interface SettlementFormValues {
  agentId: string | null;
  receivedGBP: string;
  receiptNumber: string;
  notes: string;
}

interface SettlementFormProps {
  agents: SettlementAgent[];
  values: SettlementFormValues;
  onChange: (next: SettlementFormValues) => void;
  onSubmit: () => void;
  errorMessage?: string | null;
  submitting?: boolean;
  rateMissing?: boolean;
}

export function SettlementForm({
  agents,
  values,
  onChange,
  onSubmit,
  errorMessage,
  submitting,
  rateMissing,
}: SettlementFormProps) {
  const numericAmount = Number(values.receivedGBP);
  const validAmount =
    values.receivedGBP !== "" &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0;
  const canSubmit =
    !!values.agentId &&
    validAmount &&
    values.receiptNumber.trim().length > 0 &&
    !rateMissing &&
    !submitting;

  function patch<K extends keyof SettlementFormValues>(
    key: K,
    val: SettlementFormValues[K]
  ) {
    onChange({ ...values, [key]: val });
  }

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }}
      noValidate
    >
      <AgentSelector
        agents={agents}
        value={values.agentId}
        onChange={(id) => patch("agentId", id)}
      />

      <div className={styles.field}>
        <Label htmlFor="received">Cash received (GBP)</Label>
        <Input
          id="received"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="e.g. 10000"
          value={values.receivedGBP}
          onChange={(e) => patch("receivedGBP", e.target.value)}
          required
        />
      </div>

      <div className={styles.field}>
        <Label htmlFor="receipt">Receipt number</Label>
        <Input
          id="receipt"
          type="text"
          placeholder="e.g. R-2026-0042"
          value={values.receiptNumber}
          onChange={(e) => patch("receiptNumber", e.target.value)}
          required
        />
      </div>

      <div className={styles.field}>
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          rows={3}
          value={values.notes}
          onChange={(e) => patch("notes", e.target.value)}
        />
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {rateMissing && (
        <Alert variant="destructive">
          <AlertDescription>
            Today's GBP→USD rate has not been set. Visit Daily Setup before
            recording a settlement.
          </AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={!canSubmit} className={styles.submit}>
        {submitting ? "Saving…" : "Record Settlement"}
      </Button>
    </form>
  );
}
