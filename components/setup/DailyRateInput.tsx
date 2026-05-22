"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  convertGBPtoUSD,
  formatCurrency,
  formatLongDate,
} from "@/lib/utils";
import styles from "./DailyRateInput.module.css";

const PREVIEW_GBP = 1000;
const MIN_RATE = 0.5;
const MAX_RATE = 5;

export interface DailyRateInputProps {
  initialRate?: number;
  submitting?: boolean;
  errorMessage?: string | null;
  onSubmit: (rate: number) => void | Promise<void>;
}

export function DailyRateInput({
  initialRate,
  submitting = false,
  errorMessage = null,
  onSubmit,
}: DailyRateInputProps) {
  const [value, setValue] = useState<string>(
    initialRate ? String(initialRate) : ""
  );
  const [touched, setTouched] = useState(false);

  const numeric = Number(value);
  const isValidNumber = value !== "" && Number.isFinite(numeric);
  const inRange = numeric >= MIN_RATE && numeric <= MAX_RATE;
  const validationError =
    touched && value !== "" && (!isValidNumber || !inRange)
      ? `Rate must be a number between ${MIN_RATE} and ${MAX_RATE}.`
      : null;

  const preview = useMemo(() => {
    if (!isValidNumber || numeric <= 0) return null;
    return convertGBPtoUSD(PREVIEW_GBP, numeric);
  }, [isValidNumber, numeric]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!isValidNumber || !inRange) return;
    onSubmit(numeric);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <Label htmlFor="rate-date">Date</Label>
        <Input id="rate-date" value={formatLongDate()} readOnly />
      </div>

      <div className={styles.field} data-tour="rate-input">
        <Label htmlFor="rate">GBP → USD rate today</Label>
        <Input
          id="rate"
          type="number"
          inputMode="decimal"
          step="0.0001"
          min={MIN_RATE}
          max={MAX_RATE}
          placeholder="e.g. 1.27"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setTouched(true)}
          autoFocus
          required
        />
      </div>

      <div className={styles.preview} aria-live="polite">
        {preview !== null ? (
          <>
            <span className={styles.previewLabel}>Live preview</span>
            <span className={styles.previewValue}>
              {formatCurrency(PREVIEW_GBP, "GBP")} ={" "}
              {formatCurrency(preview, "USD")} at this rate
            </span>
          </>
        ) : (
          <span className={styles.previewMuted}>
            Enter a rate to see a conversion preview.
          </span>
        )}
      </div>

      {(validationError || errorMessage) && (
        <Alert variant="destructive">
          <AlertDescription>
            {validationError ?? errorMessage}
          </AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={submitting || !isValidNumber || !inRange}
        className={styles.submit}
      >
        {submitting ? "Saving…" : "Confirm rate & start day"}
      </Button>
    </form>
  );
}
