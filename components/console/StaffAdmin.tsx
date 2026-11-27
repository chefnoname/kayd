"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { consoleAction } from "./consoleApi";
import styles from "@/app/console/console.module.css";

export function InviteStaffForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await consoleAction("invite_staff", { name, email });
      toast({ title: r.message ?? "Invite sent." });
      setName("");
      setEmail("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className={styles.stack}>
      <label className={styles.field}>
        Name
        <input className={styles.control} required value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className={styles.field}>
        Work email
        <input
          className={styles.control}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? "Sending…" : "Send invite"}
      </Button>
      <p className={styles.muted}>They get an email to choose their own password. Everyone on the team has the same access.</p>
    </form>
  );
}

export function RemoveStaffButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      const r = await consoleAction("remove_staff", { userId });
      toast({ title: r.message ?? "Removed." });
      router.refresh();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!confirming)
    return (
      <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
        Remove
      </Button>
    );
  return (
    <span className={styles.actions}>
      <Button variant="destructive" size="sm" onClick={remove} disabled={busy}>
        {busy ? "Removing…" : `Remove ${name}`}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={busy}>
        Cancel
      </Button>
    </span>
  );
}
