"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import styles from "../login/login.module.css";

export default function VerifyEmailPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

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
      if (user.email_confirmed_at) {
        router.replace("/dashboard");
        return;
      }
      setEmail(user.email ?? null);
    })();
    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function resend() {
    if (!email) return;
    setSending(true);
    setError(null);
    setMessage(null);

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
      },
    });

    setSending(false);

    if (resendError) {
      setError(resendError.message);
      return;
    }
    setMessage("Verification email sent. Check your inbox.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className={styles.shell}>
      <Card className={styles.card}>
        <CardHeader>
          <div className={styles.brand}>Kayd</div>
          <CardTitle>Verify your email</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            Please verify your email before continuing. We sent a confirmation
            link to <strong>{email ?? "your inbox"}</strong>.
          </p>

          {message && (
            <Alert style={{ marginTop: 12 }}>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" style={{ marginTop: 12 }}>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <Button onClick={resend} disabled={sending || !email}>
              {sending ? "Sending…" : "Resend verification email"}
            </Button>
            <Button variant="outline" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
