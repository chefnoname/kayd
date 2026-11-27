"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { resetToPath } from "@/lib/session-reset";
import { Button } from "@/components/ui/button";
import styles from "../console.module.css";

export default function ConsoleSetPasswordPage() {
  const supabase = createClient();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) resetToPath("/console/login");
      else setReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 12) return setError("Use at least 12 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setBusy(false);
      setError(updateError.message);
      return;
    }
    resetToPath("/console");
  }

  if (!ready) return null;

  return (
    <div className={styles.loginShell}>
      <form className={styles.loginCard} onSubmit={onSubmit}>
        <div className={styles.loginBrand}>
          <span className={styles.brandName}>Kayd</span>
          <span className={styles.brandTag}>Console</span>
        </div>
        <p className={styles.dialogText}>Choose a password for your Kayd staff account.</p>
        <label className={styles.field}>
          New password
          <input
            className={styles.control}
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          Type it again
          <input
            className={styles.control}
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} className={styles.fullWidth}>
          {busy ? "Saving…" : "Save password"}
        </Button>
      </form>
    </div>
  );
}
