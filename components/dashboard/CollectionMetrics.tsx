"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatCurrency, toDateString } from "@/lib/utils";
import styles from "./CollectionMetrics.module.css";

interface CollectionMetricsProps {
  orgId: string;
}

function getMondayOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return toDateString(monday);
}

function getFirstOfMonth(): string {
  const d = new Date();
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  return toDateString(first);
}

export function CollectionMetrics({ orgId }: CollectionMetricsProps) {
  const [dailyGBP, setDailyGBP] = useState(0);
  const [weeklyGBP, setWeeklyGBP] = useState(0);
  const [monthlyGBP, setMonthlyGBP] = useState(0);
  const [conversionRate, setConversionRate] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const today = toDateString();
    const monday = getMondayOfWeek();
    const firstOfMonth = getFirstOfMonth();

    (async () => {
      const [
        { data: dailyRows },
        { data: weeklyRows },
        { data: monthlyRows },
        { count: totalCount },
        { count: releasedCount },
      ] = await Promise.all([
        supabase
          .from("agent_deposits")
          .select("amount_received_gbp")
          .eq("organisation_id", orgId)
          .eq("date", today),
        supabase
          .from("agent_deposits")
          .select("amount_received_gbp")
          .eq("organisation_id", orgId)
          .gte("date", monday),
        supabase
          .from("agent_deposits")
          .select("amount_received_gbp")
          .eq("organisation_id", orgId)
          .gte("date", firstOfMonth),
        supabase
          .from("individual_deposits")
          .select("id", { count: "exact", head: true })
          .eq("organisation_id", orgId),
        supabase
          .from("individual_deposits")
          .select("id", { count: "exact", head: true })
          .eq("organisation_id", orgId)
          .eq("status", "released"),
      ]);

      if (cancelled) return;

      const sumGBP = (rows: any[] | null) =>
        (rows ?? []).reduce((sum: number, r: any) => sum + Number(r.amount_received_gbp), 0);

      setDailyGBP(sumGBP(dailyRows));
      setWeeklyGBP(sumGBP(weeklyRows));
      setMonthlyGBP(sumGBP(monthlyRows));

      const total = totalCount ?? 0;
      const released = releasedCount ?? 0;
      if (total > 0) {
        setConversionRate((released / total) * 100);
      } else {
        setConversionRate(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const rows: [string, string][] = [
    ["Today", formatCurrency(dailyGBP, "GBP")],
    ["This week", formatCurrency(weeklyGBP, "GBP")],
    ["This month", formatCurrency(monthlyGBP, "GBP")],
    [
      "Deposit conversion rate",
      conversionRate !== null ? `${conversionRate.toFixed(1)}%` : "—",
    ],
  ];

  return (
    <section className={styles.card} aria-labelledby="collections-title">
      <h2 id="collections-title" className={styles.title}>
        Collections
      </h2>
      <dl className={styles.rows}>
        {rows.map(([label, value]) => (
          <div key={label} className={styles.row}>
            <dt className={styles.label}>{label}</dt>
            <dd className={styles.value}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
