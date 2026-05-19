"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DailyRateInput } from "@/components/setup/DailyRateInput";
import { RateHistoryStrip } from "@/components/setup/RateHistoryStrip";
import { formatLongDate, toDateString } from "@/lib/utils";
import styles from "./setup.module.css";

interface ExistingRate {
  id: string;
  gbp_to_usd: number;
  set_at: string;
}

export default function SetupPage() {
  const router = useRouter();

  const [existing, setExisting] = useState<ExistingRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Force RateHistoryStrip to refetch after a save by changing its key
  const [historyVersion, setHistoryVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const { data, error: fetchError } = await supabase
        .from("daily_rates")
        .select("id, gbp_to_usd, set_at")
        .eq("date", toDateString())
        .maybeSingle();

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
      } else if (data) {
        setExisting({
          id: data.id,
          gbp_to_usd: Number(data.gbp_to_usd),
          set_at: data.set_at,
        });
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(rate: number) {
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const today = toDateString();
    const payload = {
      date: today,
      gbp_to_usd: rate,
      set_by: user?.id ?? null,
      set_at: new Date().toISOString(),
    };

    // Insert OR update — `date` is unique, so on edit we update by id.
    const query = existing
      ? supabase.from("daily_rates").update(payload).eq("id", existing.id)
      : supabase.from("daily_rates").insert(payload);

    const { error: writeError } = await query;
    setSubmitting(false);

    if (writeError) {
      setError(writeError.message);
      return;
    }

    setHistoryVersion((v) => v + 1);
    router.push("/dashboard");
    router.refresh();
  }

  const showForm = !existing || editing;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Daily setup"
        description="Set today's GBP→USD rate before anything else."
      />

      <Card className={styles.card}>
        <CardHeader>
          <CardTitle>
            {showForm ? "Today's rate" : "Today's rate is set"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className={styles.rateMeta}>Checking today's rate…</p>
          ) : showForm ? (
            <DailyRateInput
              initialRate={existing?.gbp_to_usd}
              submitting={submitting}
              errorMessage={error}
              onSubmit={handleSubmit}
            />
          ) : (
            <div className={styles.existing}>
              <div>
                <div className={styles.rateLabel}>GBP → USD · today</div>
                <div className={styles.rateRow}>
                  <span className={styles.rateValue}>
                    {existing!.gbp_to_usd.toFixed(4)}
                  </span>
                </div>
                <div className={styles.rateMeta}>
                  Set on {formatLongDate(new Date(existing!.set_at))}
                </div>
              </div>
              <div className={styles.actions}>
                <Button onClick={() => router.push("/dashboard")}>
                  Continue to dashboard
                </Button>
                <Button variant="outline" onClick={() => setEditing(true)}>
                  Edit rate
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <section className={styles.historySection}>
        <span className={styles.historyHeading}>Last 5 days</span>
        <RateHistoryStrip key={historyVersion} />
      </section>
    </div>
  );
}
