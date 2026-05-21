"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getOrganisationId } from "@/lib/org";
import { Badge } from "@/components/ui/badge";
import styles from "./RateHistoryStrip.module.css";

interface RateRow {
  date: string;
  gbp_to_usd: number;
}

interface StripItem {
  key: string;
  label: string;
  value: string;
  isToday: boolean;
}

const DAYS_TO_SHOW = 5;

function shortWeekday(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(d);
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function RateHistoryStrip() {
  const [items, setItems] = useState<StripItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const today = new Date();
      const earliest = new Date(today);
      earliest.setDate(today.getDate() - (DAYS_TO_SHOW - 1));

      const orgId = await getOrganisationId();
      if (!orgId) {
        if (!cancelled) setItems([]);
        return;
      }

      const { data } = await supabase
        .from("daily_rates")
        .select("date, gbp_to_usd")
        .eq("organisation_id", orgId)
        .gte("date", toDateKey(earliest))
        .lte("date", toDateKey(today))
        .order("date", { ascending: true });

      const byDate = new Map<string, number>();
      (data as RateRow[] | null)?.forEach((r) =>
        byDate.set(r.date, Number(r.gbp_to_usd))
      );

      const built: StripItem[] = [];
      for (let i = DAYS_TO_SHOW - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = toDateKey(d);
        const rate = byDate.get(key);
        built.push({
          key,
          label: shortWeekday(d),
          value: rate !== undefined ? rate.toFixed(2) : "—",
          isToday: i === 0,
        });
      }

      if (!cancelled) setItems(built);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!items) {
    return (
      <div className={styles.strip} aria-busy="true">
        <span className={styles.muted}>Loading rate history…</span>
      </div>
    );
  }

  return (
    <div className={styles.strip} aria-label="Last 5 daily rates">
      {items.map((item, idx) => (
        <span key={item.key} className={styles.itemWrap}>
          <Badge
            variant={item.isToday ? "default" : "secondary"}
            className={styles.badge}
          >
            <span className={styles.day}>{item.label}</span>
            <span className={styles.value}>{item.value}</span>
          </Badge>
          {idx < items.length - 1 && (
            <span className={styles.sep} aria-hidden>
              |
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
