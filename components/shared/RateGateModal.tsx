"use client";

import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import styles from "./RateGateModal.module.css";

interface RateGateModalProps {
  open: boolean;
  onSubmitted: (sendRate: number, receiveRate: number) => void;
}

/**
 * Hard-block modal that requires both send and receive rates before
 * the dashboard becomes usable. No close button, no escape, no dismiss.
 */
export function RateGateModal({ open, onSubmitted }: RateGateModalProps) {
  const [sendRate, setSendRate] = useState("");
  const [receiveRate, setReceiveRate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendNum = parseFloat(sendRate);
  const receiveNum = parseFloat(receiveRate);
  const valid =
    !isNaN(sendNum) && sendNum > 0 && !isNaN(receiveNum) && receiveNum > 0;

  async function handleSubmit() {
    if (!valid) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/rates/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          send_rate: sendNum,
          receive_rate: receiveNum,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit rates");
      }

      onSubmitted(sendNum, receiveNum);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogPrimitive.Root open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.overlay} />
        <DialogPrimitive.Content
          className={styles.content}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className={styles.header}>
            <DialogPrimitive.Title className={styles.title}>
              Set Today&rsquo;s Rates
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className={styles.description}>
              Enter the send and receive rates before continuing. This is
              required every session.
            </DialogPrimitive.Description>
          </div>

          <div className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="rg-send" className={styles.label}>
                Send rate (GBP → USD)
              </label>
              <input
                id="rg-send"
                type="number"
                step="0.0001"
                min="0"
                placeholder="e.g. 1.2650"
                className={styles.input}
                value={sendRate}
                onChange={(e) => setSendRate(e.target.value)}
                autoFocus
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="rg-receive" className={styles.label}>
                Receive rate (USD → GBP)
              </label>
              <input
                id="rg-receive"
                type="number"
                step="0.0001"
                min="0"
                placeholder="e.g. 1.2700"
                className={styles.input}
                value={receiveRate}
                onChange={(e) => setReceiveRate(e.target.value)}
              />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <Button
            className={styles.submitBtn}
            disabled={!valid || submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Submitting…" : "Confirm rates"}
          </Button>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
