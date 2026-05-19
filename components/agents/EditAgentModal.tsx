"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase";
import type { Agent } from "./types";
import styles from "./AgentModal.module.css";

interface EditAgentModalProps {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditAgentModal({
  agent,
  open,
  onOpenChange,
  onSaved,
}: EditAgentModalProps) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [balance, setBalance] = useState("0");
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!agent) return;
    setName(agent.name);
    setCity(agent.city);
    setPhone(agent.phone ?? "");
    setBalance(String(agent.balance_usd));
    setActive(agent.status === "active");
    setError(null);
  }, [agent]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agent) return;
    setError(null);

    const trimmedName = name.trim();
    const trimmedCity = city.trim();
    const numericBalance = Number(balance);

    if (!trimmedName) return setError("Name is required.");
    if (!trimmedCity) return setError("City is required.");
    if (!Number.isFinite(numericBalance) || numericBalance < 0) {
      return setError("Balance must be 0 or greater.");
    }

    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("agents")
      .update({
        name: trimmedName,
        city: trimmedCity,
        phone: phone.trim() || null,
        balance_usd: numericBalance,
        status: active ? "active" : "inactive",
        updated_at: new Date().toISOString(),
      })
      .eq("id", agent.id);
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit agent</DialogTitle>
          <DialogDescription>
            Update this agent's details or change their status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className={styles.form}>
          <div className={styles.field}>
            <Label htmlFor="edit-name">Full Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <Label htmlFor="edit-city">City</Label>
            <Input
              id="edit-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <Label htmlFor="edit-phone">Phone</Label>
            <Input
              id="edit-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <Label htmlFor="edit-balance">Balance (USD)</Label>
            <Input
              id="edit-balance"
              type="number"
              min="0"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              required
            />
          </div>

          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <span>Active</span>
            <span className={styles.toggleHint}>
              {active
                ? "Agent is active and counted in totals."
                : "Inactive agents are greyed out and excluded from In-Debt filter."}
            </span>
          </label>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
