"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import styles from "./ClosingBalanceInput.module.css";

interface ClosingBalanceInputProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function ClosingBalanceInput({
  value,
  onChange,
  disabled,
}: ClosingBalanceInputProps) {
  return (
    <div className={styles.field}>
      <Label htmlFor="physical-count">Physical cash count (GBP)</Label>
      <Input
        id="physical-count"
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        placeholder="e.g. 105000"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      <p className={styles.hint}>
        Enter the total cash physically counted in the safe at end of day.
      </p>
    </div>
  );
}
