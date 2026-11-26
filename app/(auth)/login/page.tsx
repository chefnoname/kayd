"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { resetToPath } from "@/lib/session-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import styles from "./login.module.css";
import Image from "next/image";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const blocked = searchParams.get("blocked");
  const [error, setError] = useState<string | null>(
    blocked === "locked"
      ? "Your account has been locked. Ask your organisation's admin or Kayd support to unlock it."
      : blocked === "suspended"
        ? "Your organisation's Kayd account is suspended. Please contact Kayd support."
        : searchParams.get("error")
  );
  const [loading, setLoading] = useState(false);

  // Handle implicit-flow invite/recovery links that Supabase sends as
  // URL fragments: /login#access_token=...&refresh_token=...&type=invite
  // Fragments are client-side only, so this must run in a useEffect.
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (!accessToken || !refreshToken) return;

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: sessionError }) => {
        if (sessionError) return;
        if (type === "invite" || type === "recovery") {
          resetToPath("/set-password");
        } else {
          resetToPath("/dashboard");
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Drop any previous login before starting a new one.
    await supabase.auth.signOut({ scope: "local" });

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      const msg = signInError.message.toLowerCase();
      if (msg.includes("banned")) {
        setError(
          "Your account has been locked. Ask your organisation's admin or Kayd support to unlock it."
        );
        return;
      }
      if (msg.includes("invalid login credentials")) {
        router.push(`/signup?email=${encodeURIComponent(email)}`);
        return;
      }
      setError(signInError.message);
      return;
    }

    // Stamp last_active_at immediately — more reliable than the DB trigger.
    if (signInData.user) {
      await supabase
        .from("staff_users")
        .update({ last_active_at: new Date().toISOString() })
        .eq("id", signInData.user.id);
    }

    resetToPath("/dashboard");
  }

  return (
    <div className={styles.shell}>
      <Card className={styles.card}>
        <CardHeader>
          <Image
            src="/kayd.png"
            alt="Kayd logo"
            width={250}
            height={0}
            className={styles.logo}
          />
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className={styles.form}>
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
                autoComplete="current-password"
                required
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
              {loading ? "Signing in…" : "Sign in"}
            </Button>

            <p style={{ fontSize: 14, textAlign: "center" }}>
              Don&apos;t have an account?{" "}
              <Link href={`/signup${email ? `?email=${encodeURIComponent(email)}` : ""}`}>
                <strong>Create one</strong>
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
