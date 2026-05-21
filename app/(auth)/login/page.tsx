"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import styles from "./login.module.css";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      const msg = signInError.message.toLowerCase();
      if (
        msg.includes("email not confirmed") ||
        msg.includes("not confirmed") ||
        msg.includes("email_not_confirmed")
      ) {
        setError(
          "Please verify your email before logging in. Check your inbox for the confirmation link."
        );
      } else {
        setError(signInError.message);
      }
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className={styles.shell}>
      <Card className={styles.card}>
        <CardHeader>
          {/* <div className={styles.brand}>Kayd</div> */}
          <Image
            src="/kayd.png"
            alt="Kayd logo"
            width={250}
            height={0}
            className={styles.logo}
          />
          {/* <CardTitle>Sign in</CardTitle> */}
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
              <Link href="/signup"><strong>
                Create one
              </strong>
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
