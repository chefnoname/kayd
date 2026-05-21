"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import styles from "../login/login.module.css";

export default function SignupPage() {
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) return setError("Name is required.");
    if (password.length < 8)
      return setError("Password must be at least 8 characters.");

    setLoading(true);

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

    const { error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        // Public signup → admin role for their own org
        data: { name: trimmedName, role: "admin" },
        emailRedirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className={styles.shell}>
        <Card className={styles.card}>
          <CardHeader>
            <div className={styles.brand}>Kayd</div>
            <CardTitle>Check your email</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              We&apos;ve sent a confirmation link to{" "}
              <strong>{email}</strong>. Click it to verify your account, then
              sign in.
            </p>
            <div style={{ marginTop: 16 }}>
              <Link href="/login">Back to sign in</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <Card className={styles.card}>
        <CardHeader>
          <div className={styles.brand}>Kayd</div>
          <CardTitle>Create your account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className={styles.form}>
            <div className={styles.field}>
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <Label htmlFor="password">Password</Label>
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

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className={styles.submit}>
              {loading ? "Creating account…" : "Create account"}
            </Button>

            <p style={{ fontSize: 14, textAlign: "center" }}>
              Already have an account? <Link href="/login">Sign in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
