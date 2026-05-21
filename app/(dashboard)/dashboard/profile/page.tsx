"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import styles from "./profile.module.css";

export default function ProfilePage() {
  const supabase = createClient();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      setUserId(user.id);

      const { data } = await supabase
        .from("staff_users")
        .select("name, email")
        .eq("id", user.id)
        .maybeSingle();

      if (!cancelled && data) {
        setName(data.name ?? "");
        setEmail(data.email ?? "");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) return setError("Name is required.");
    if (!trimmedEmail) return setError("Email is required.");

    setSaving(true);

    const { error: updateError } = await supabase
      .from("staff_users")
      .update({ name: trimmedName, email: trimmedEmail })
      .eq("id", userId!);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    toast({ title: "Profile updated", description: "Your changes have been saved." });
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Profile"
        description="Update your display name and email address."
      />

      <Card className={styles.card}>
        <CardHeader>
          <CardTitle>Personal details</CardTitle>
          <CardDescription>
            Changes here update your record in the team directory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className={styles.loading}>Loading…</p>
          ) : (
            <form onSubmit={onSubmit} className={styles.form}>
              <div className={styles.field}>
                <Label htmlFor="profile-name">Full name</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>

              <div className={styles.field}>
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={saving} className={styles.save}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
