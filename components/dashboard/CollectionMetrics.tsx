"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatCurrency, toDateString } from "@/lib/utils";
import { StatCard } from "./StatCard";
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
          .from("collection_pickups")
          .select("amount_gbp")
          .eq("organisation_id", orgId)
          .eq("date", today),
        supabase
          .from("collection_pickups")
          .select("amount_gbp")
          .eq("organisation_id", orgId)
          .gte("date", monday),
        supabase
          .from("collection_pickups")
          .select("amount_gbp")
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
        (rows ?? []).reduce((sum: number, r: any) => sum + Number(r.amount_gbp), 0);

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

  return (
    <div className={styles.grid}>
      <StatCard label="Collections Today" displayValue={formatCurrency(dailyGBP, "GBP")} />
      <StatCard label="Collections This Week" displayValue={formatCurrency(weeklyGBP, "GBP")} />
      <StatCard label="Collections This Month" displayValue={formatCurrency(monthlyGBP, "GBP")} />
      <StatCard
        label="Deposit Conversion Rate"
        displayValue={conversionRate !== null ? `${conversionRate.toFixed(1)}%` : "—"}
      />
    </div>
  );
}
