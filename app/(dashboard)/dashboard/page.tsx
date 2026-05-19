"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { PageHeader } from "@/components/shared/PageHeader";
import { DailyRateBadge } from "@/components/dashboard/DailyRateBadge";
import { AlertsBanner } from "@/components/dashboard/AlertsBanner";
import { OpeningBalanceCard } from "@/components/dashboard/OpeningBalanceCard";
import { BalanceSummaryRow } from "@/components/dashboard/BalanceSummaryRow";
import {
  ActivityFeed,
  type ActivityRow,
} from "@/components/dashboard/ActivityFeed";
import { QuickActions } from "@/components/dashboard/QuickActions";
import type { DailyBalance } from "@/components/dashboard/types";
import { formatLongDate, toDateString, usdToGbp } from "@/lib/utils";
import styles from "./dashboard.module.css";

function yesterdayDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d;
}

export default function DashboardPage() {
  const today = toDateString();
  const yesterday = toDateString(yesterdayDate());

  const [rate, setRate] = useState<number | null>(null);
  const [balance, setBalance] = useState<DailyBalance | null>(null);
  const [agentDebtGBP, setAgentDebtGBP] = useState<number>(0);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();

    // Today's rate
    const { data: rateRow } = await supabase
      .from("daily_rates")
      .select("gbp_to_usd")
      .eq("date", today)
      .maybeSingle();
    const todayRate = rateRow ? Number(rateRow.gbp_to_usd) : null;
    setRate(todayRate);

    // Today's DailyBalance — create if missing using yesterday's closing
    let { data: balanceRow } = await supabase
      .from("daily_balances")
      .select(
        "id, date, opening_gbp, system_limit_usd, cash_in_safe_gbp, total_agent_debt_gbp, collections_today_gbp, closing_gbp, is_closed, discrepancy"
      )
      .eq("date", today)
      .maybeSingle();

    if (!balanceRow) {
      const { data: prevRow } = await supabase
        .from("daily_balances")
        .select("closing_gbp")
        .eq("date", yesterday)
        .maybeSingle();

      const opening = prevRow ? Number(prevRow.closing_gbp) : 0;

      const { data: inserted } = await supabase
        .from("daily_balances")
        .insert({
          date: today,
          opening_gbp: opening,
          cash_in_safe_gbp: opening,
          closing_gbp: opening,
        })
        .select(
          "id, date, opening_gbp, system_limit_usd, cash_in_safe_gbp, total_agent_debt_gbp, collections_today_gbp, closing_gbp, is_closed, discrepancy"
        )
        .single();

      balanceRow = inserted ?? null;
    }

    if (balanceRow) {
      setBalance({
        id: balanceRow.id,
        date: balanceRow.date,
        opening_gbp: Number(balanceRow.opening_gbp),
        system_limit_usd: Number(balanceRow.system_limit_usd),
        cash_in_safe_gbp: Number(balanceRow.cash_in_safe_gbp),
        total_agent_debt_gbp: Number(balanceRow.total_agent_debt_gbp),
        collections_today_gbp: Number(balanceRow.collections_today_gbp),
        closing_gbp: Number(balanceRow.closing_gbp),
        is_closed: balanceRow.is_closed,
        discrepancy: Number(balanceRow.discrepancy),
      });
    }

    // Total active agent debt (USD → GBP at today's rate)
    const { data: agentRows } = await supabase
      .from("agents")
      .select("balance_usd")
      .eq("status", "active");

    const totalDebtUSD = (agentRows ?? []).reduce(
      (sum, a: any) => sum + Number(a.balance_usd),
      0
    );
    setAgentDebtGBP(todayRate ? usdToGbp(totalDebtUSD, todayRate) : 0);

    // Today's activity — last 10 settlements
    setLoadingActivity(true);
    const { data: settlementRows } = await supabase
      .from("settlements")
      .select(
        "id, amount_received_gbp, amount_usd_equivalent, receipt_number, created_at, agents:agent_id ( name )"
      )
      .eq("date", today)
      .order("created_at", { ascending: false })
      .limit(10);

    setActivity(
      (settlementRows ?? []).map((r: any) => ({
        id: r.id,
        agent_name: r.agents?.name ?? "Unknown",
        amount_received_gbp: Number(r.amount_received_gbp),
        amount_usd_equivalent: Number(r.amount_usd_equivalent),
        receipt_number: r.receipt_number,
        created_at: r.created_at,
      }))
    );
    setLoadingActivity(false);
  }, [today, yesterday]);

  useEffect(() => {
    load();
  }, [load]);

  async function patchBalance(patch: Partial<DailyBalance>) {
    if (!balance) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("daily_balances")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", balance.id);
    if (error) throw error;
    setBalance({ ...balance, ...patch });
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Dashboard"
        description="Today's cash position at a glance."
        actions={
          <div className={styles.topRow}>
            <span className={styles.dateLine}>{formatLongDate()}</span>
            <DailyRateBadge rate={rate} />
          </div>
        }
      />

      {balance && (
        <AlertsBanner
          discrepancy={balance.discrepancy}
          isClosed={balance.is_closed}
        />
      )}

      {balance && (
        <OpeningBalanceCard
          openingGBP={balance.opening_gbp}
          yesterday={yesterdayDate()}
        />
      )}

      {balance && (
        <BalanceSummaryRow
          systemLimitUSD={balance.system_limit_usd}
          cashInSafeGBP={balance.cash_in_safe_gbp}
          totalAgentDebtGBP={agentDebtGBP}
          onSaveSystemLimit={(next) =>
            patchBalance({ system_limit_usd: next })
          }
          onSaveCashInSafe={(next) =>
            patchBalance({ cash_in_safe_gbp: next })
          }
        />
      )}

      <div className={styles.bottomGrid}>
        <ActivityFeed rows={activity} loading={loadingActivity} />
        <QuickActions />
      </div>
    </div>
  );
}
