"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import styles from "../login/login.module.css";
import Image from "next/image";

/**
 * Landing page for invited users (and password resets).
 * The Supabase invite/recovery link drops a session cookie via
 * /auth/callback, then redirects here. The user picks a password
 * and is sent straight into the app.
 */
export default function SetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        router.replace("/login");
        return;
      }
      setEmail(user.email ?? null);
      setUserId(user.id);

      // Pre-fill name if the user already has one (e.g. password reset flow)
      const { data: staffRow } = await supabase
        .from("staff_users")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();
      if (active && staffRow?.name) setFullName(staffRow.name);

      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) return setError("Full name is required.");
    if (password.length < 8)
      return setError("Password must be at least 8 characters.");
    if (password !== confirm)
      return setError("Passwords do not match.");

    setSaving(true);

    // Update password and auth metadata together
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { name: trimmedName },
    });

    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }

    // Persist name to staff_users so the rest of the app can read it
    if (userId) {
      await supabase
        .from("staff_users")
        .update({ name: trimmedName })
        .eq("id", userId);
    }

    setSaving(false);
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className={styles.shell}>
      <Card className={styles.card}>
        <CardHeader>
          <Image
            src="/kayd.png"
            alt="Kayd logo"
            width={175}
            height={0}
            className={styles.logo}
          />
          <CardTitle>Welcome to Kayd — set your password to get started.</CardTitle>
        </CardHeader>
        <CardContent>
          {!ready ? (
            <p>Loading…</p>
          ) : (
            <form onSubmit={onSubmit} className={styles.form}>
              {email && (
                <p style={{ fontSize: 14, color: "#666" }}>
                  Signed in as <strong>{email}</strong>
                </p>
              )}

              <div className={styles.field}>
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={saving} className={styles.submit}>
                {saving ? "Saving…" : "Set password & continue"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
