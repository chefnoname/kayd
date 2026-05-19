"use client";

import { useState } from "react";
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
import styles from "./AgentModal.module.css";

interface AddAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function AddAgentModal({
  open,
  onOpenChange,
  onCreated,
}: AddAgentModalProps) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [balance, setBalance] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setName("");
    setCity("");
    setPhone("");
    setBalance("0");
    setError(null);
    setSaving(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedCity = city.trim();
    const numericBalance = Number(balance);

    if (!trimmedName) return setError("Name is required.");
    if (!trimmedCity) return setError("City is required.");
    if (!Number.isFinite(numericBalance) || numericBalance < 0) {
      return setError("Opening balance must be 0 or greater.");
    }

    setSaving(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("agents").insert({
      name: trimmedName,
      city: trimmedCity,
      phone: phone.trim() || null,
      balance_usd: numericBalance,
      status: "active",
    });
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    reset();
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add agent</DialogTitle>
          <DialogDescription>
            Add a new agent to the network.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className={styles.form}>
          <div className={styles.field}>
            <Label htmlFor="agent-name">Full Name</Label>
            <Input
              id="agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className={styles.field}>
            <Label htmlFor="agent-city">City</Label>
            <Input
              id="agent-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <Label htmlFor="agent-phone">Phone</Label>
            <Input
              id="agent-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <Label htmlFor="agent-balance">Opening Balance (USD)</Label>
            <Input
              id="agent-balance"
              type="number"
              min="0"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              required
            />
          </div>

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
              {saving ? "Saving…" : "Add agent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
