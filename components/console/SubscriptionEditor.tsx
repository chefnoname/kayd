"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { consoleAction } from "./consoleApi";
import styles from "@/app/console/console.module.css";

export type SubscriptionValues = {
  organisationId: string;
  name: string;
  status: "active" | "trial" | "suspended";
  plan: string | null;
  priceGbpMonthly: number | null;
  renewsOn: string | null;
  trialEndsOn: string | null;
};

/** Manual subscription entry until billing is connected. */
export function SubscriptionEditor({ value }: { value: SubscriptionValues }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(value.status === "trial" ? "trial" : "active");
  const [plan, setPlan] = useState(value.plan ?? "");
  const [price, setPrice] = useState(value.priceGbpMonthly?.toString() ?? "");
  const [renewsOn, setRenewsOn] = useState(value.renewsOn ?? "");
  const [trialEndsOn, setTrialEndsOn] = useState(value.trialEndsOn ?? "");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await consoleAction("update_subscription", {
        organisationId: value.organisationId,
        status,
        plan,
        priceGbpMonthly: price,
        renewsOn,
        trialEndsOn,
      });
      toast({ title: r.message ?? "Saved." });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={save} className={styles.stack}>
            <DialogHeader>
              <DialogTitle>Subscription for {value.name}</DialogTitle>
              <DialogDescription>Entered by hand for now. This does not charge the client.</DialogDescription>
            </DialogHeader>
            {value.status !== "suspended" && (
              <label className={styles.field}>
                Status
                <select className={styles.control} value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                </select>
              </label>
            )}
            <label className={styles.field}>
              Plan
              <input className={styles.control} value={plan} onChange={(e) => setPlan(e.target.value)} />
            </label>
            <label className={styles.field}>
              Price per month (£)
              <input
                className={styles.control}
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>
            {status === "trial" ? (
              <label className={styles.field}>
                Trial ends
                <input
                  className={styles.control}
                  type="date"
                  value={trialEndsOn}
                  onChange={(e) => setTrialEndsOn(e.target.value)}
                />
              </label>
            ) : (
              <label className={styles.field}>
                Renews on
                <input
                  className={styles.control}
                  type="date"
                  value={renewsOn}
                  onChange={(e) => setRenewsOn(e.target.value)}
                />
              </label>
            )}
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
