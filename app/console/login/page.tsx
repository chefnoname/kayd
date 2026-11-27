"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { resetToPath } from "@/lib/session-reset";
import { Button } from "@/components/ui/button";
import styles from "../console.module.css";

const NOT_STAFF = "This account is not a Kayd staff account.";

function ConsoleLogin() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("denied") ? NOT_STAFF : null
  );

  // A signed-in non-staff account that was sent here is signed out at once.
  useEffect(() => {
    if (searchParams.get("denied")) {
      void supabase.auth.signOut({ scope: "local" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Invite and reset emails land here with the session in the URL fragment.
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) return;
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error: e }) => {
      if (e) {
        setError("This link has expired or was already used. Ask another Kayd staff member to resend it.");
        return;
      }
      resetToPath("/console/set-password");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    await supabase.auth.signOut({ scope: "local" });
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setBusy(false);
      setError(
        signInError.message.toLowerCase().includes("banned")
          ? "This account can no longer open the console."
          : "Email or password is wrong."
      );
      return;
    }
    const res = await fetch("/api/console/me");
    if (!res.ok) {
      await supabase.auth.signOut({ scope: "local" });
      setBusy(false);
      setError(NOT_STAFF);
      return;
    }
    resetToPath("/console");
  }

  return (
    <div className={styles.loginShell}>
      <form className={styles.loginCard} onSubmit={onSubmit}>
        <div className={styles.loginBrand}>
          <span className={styles.brandName}>Kayd</span>
          <span className={styles.brandTag}>Console</span>
        </div>
        <p className={styles.dialogText}>For Kayd team members only. Every action is logged.</p>
        <label className={styles.field}>
          Email
          <input
            className={styles.control}
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          Password
          <input
            className={styles.control}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} className={styles.fullWidth}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}

export default function ConsoleLoginPage() {
  return (
    <Suspense fallback={null}>
      <ConsoleLogin />
    </Suspense>
  );
}
