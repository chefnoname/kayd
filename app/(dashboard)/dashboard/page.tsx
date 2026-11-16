"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getOrganisationId } from "@/lib/org";
import Link from "next/link";
import { Banknote } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Pill } from "@/components/shared/Pill";
import { Button } from "@/components/ui/button";
import { AlertsBanner } from "@/components/dashboard/AlertsBanner";
import { CashPosition } from "@/components/dashboard/CashPosition";
import { NeedsAttention } from "@/components/dashboard/NeedsAttention";
import {
  ActivityFeed,
  type ActivityRow,
} from "@/components/dashboard/ActivityFeed";
import { OfficeSettings } from "@/components/dashboard/OfficeSettings";
import { EditableStatCard } from "@/components/dashboard/EditableStatCard";
import { BankDetailsCard } from "@/components/dashboard/BankDetailsCard";
import { CollectionMetrics } from "@/components/dashboard/CollectionMetrics";
import type { DailyBalance } from "@/components/dashboard/types";
import { toDateString, usdToGbp } from "@/lib/utils";
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
  const [agentDebtUSD, setAgentDebtUSD] = useState<number>(0);
  const [owingAgents, setOwingAgents] = useState<number>(0);
  const [collectedToday, setCollectedToday] = useState<{
    totalGBP: number;
    count: number;
  }>({ totalGBP: 0, count: 0 });
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("staff");
  const [bankDetails, setBankDetails] = useState<{
    bank_name: string | null;
    sort_code: string | null;
    account_number: string | null;
  }>({ bank_name: null, sort_code: null, account_number: null });

  const load = useCallback(async () => {
    const supabase = createClient();
    const fetchedOrgId = await getOrganisationId();
    if (!fetchedOrgId) {
      setLoadingActivity(false);
      return;
    }
    const orgId = fetchedOrgId;
    setOrgId(orgId);

    // Fetch user role
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: staffRow } = await supabase
        .from("staff_users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (staffRow) setUserRole(staffRow.role);
    }

    // Fetch bank details via the server route (uses admin client, bypasses RLS)
    const bankRes = await fetch("/api/org/bank-details").catch(() => null);
    if (bankRes?.ok) {
      const bankData = await bankRes.json();
      setBankDetails({
        bank_name: bankData.bank_name,
        sort_code: bankData.sort_code,
        account_number: bankData.account_number,
      });
    }

    // Today's rate
    const { data: rateRow } = await supabase
      .from("daily_rates")
      .select("gbp_to_usd")
      .eq("organisation_id", orgId)
      .eq("date", today)
      .maybeSingle();
    let todayRate = rateRow ? Number(rateRow.gbp_to_usd) : null;

    // Auto-seed rate for new orgs that joined after today's cron run
    if (!todayRate) {
      const seedRes = await fetch("/api/rates/seed", { method: "POST" }).catch(() => null);
      if (seedRes?.ok) {
        const seedData = await seedRes.json();
        todayRate = seedData.gbp_to_usd ?? null;
      }
    }

    setRate(todayRate);

    // Today's DailyBalance — create if missing using yesterday's closing
    let { data: balanceRow } = await supabase
      .from("daily_balances")
      .select(
        "id, date, opening_gbp, system_limit_usd, cash_in_safe_gbp, total_agent_debt_gbp, collections_today_gbp, closing_gbp, is_closed, discrepancy"
      )
      .eq("organisation_id", orgId)
      .eq("date", today)
      .maybeSingle();

    if (!balanceRow) {
      const { data: prevRow } = await supabase
        .from("daily_balances")
        .select("closing_gbp")
        .eq("organisation_id", orgId)
        .eq("date", yesterday)
        .maybeSingle();

      const opening = prevRow ? Number(prevRow.closing_gbp) : 0;

      const { data: upserted } = await supabase
        .from("daily_balances")
        .upsert(
          {
            organisation_id: orgId,
            date: today,
            opening_gbp: opening,
            cash_in_safe_gbp: opening,
            closing_gbp: opening,
          },
          { onConflict: "organisation_id,date", ignoreDuplicates: true }
        )
        .select(
          "id, date, opening_gbp, system_limit_usd, cash_in_safe_gbp, total_agent_debt_gbp, collections_today_gbp, closing_gbp, is_closed, discrepancy"
        )
        .maybeSingle();

      // If ignoreDuplicates suppressed the row (already existed), fetch it
      if (upserted) {
        balanceRow = upserted;
      } else {
        const { data: existing } = await supabase
          .from("daily_balances")
          .select(
            "id, date, opening_gbp, system_limit_usd, cash_in_safe_gbp, total_agent_debt_gbp, collections_today_gbp, closing_gbp, is_closed, discrepancy"
          )
          .eq("organisation_id", orgId)
          .eq("date", today)
          .maybeSingle();
        balanceRow = existing ?? null;
      }
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
      .select("id, name, balance_usd")
      .eq("organisation_id", orgId)
      .eq("status", "active");

    const rows = (agentRows ?? []).map((a: any) => ({ id: a.id, name: a.name, balance_usd: Number(a.balance_usd) }));

    const totalDebtUSD = rows.reduce(
      (sum, a) => sum + a.balance_usd,
      0
    );
    setAgentDebtGBP(todayRate ? usdToGbp(totalDebtUSD, todayRate) : 0);
    setAgentDebtUSD(totalDebtUSD);
    setOwingAgents(rows.filter((a) => a.balance_usd > 0).length);

    // Everything collected from agents today (the activity list below is
    // capped at 10 rows, so total it separately)
    const { data: todayAmounts } = await supabase
      .from("agent_deposits")
      .select("amount_received_gbp")
      .eq("organisation_id", orgId)
      .eq("date", today);
    setCollectedToday({
      totalGBP: (todayAmounts ?? []).reduce(
        (sum: number, r: any) => sum + Number(r.amount_received_gbp),
        0
      ),
      count: (todayAmounts ?? []).length,
    });

    // Today's activity — last 10 agent deposits
    setLoadingActivity(true);
    const { data: depositRows } = await supabase
      .from("agent_deposits")
      .select(
        "id, amount_received_gbp, amount_usd_equivalent, receipt_number, created_at, agents:agent_id ( name )"
      )
      .eq("organisation_id", orgId)
      .eq("date", today)
      .order("created_at", { ascending: false })
      .limit(10);

    setActivity(
      (depositRows ?? []).map((r: any) => ({
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

    // Re-fetch whenever the tab regains focus so balances and activity
    // are never stale after the user works in another tab or page.
    function onVisible() {
      if (document.visibilityState === "visible") load();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  async function patchBalance(patch: Partial<DailyBalance>) {
    if (!balance) return;
    const supabase = createClient();
    const orgId = await getOrganisationId();
    if (!orgId) return;
    const { error } = await supabase
      .from("daily_balances")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("organisation_id", orgId)
      .eq("id", balance.id);
    if (error) throw error;
    setBalance({ ...balance, ...patch });
  }

  const longDate = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className={styles.page}>
      <PageHeader
        title="Dashboard"
        description={
          <span className={styles.dateLine}>
            <span>{longDate}</span>
            {balance &&
              (balance.is_closed ? (
                <Pill tone="info" dot>
                  Day closed
                </Pill>
              ) : (
                <Pill tone="success" dot>
                  Day open
                </Pill>
              ))}
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline" className={styles.headerAction}>
              <Link href="/end-of-day">Close day</Link>
            </Button>
            <Button asChild className={styles.headerAction}>
              <Link href="/agent-deposits">
                <Banknote size={18} aria-hidden />
                Record agent deposit
              </Link>
            </Button>
          </>
        }
      />

      {balance && (
        <AlertsBanner
          discrepancy={balance.discrepancy}
          isClosed={balance.is_closed}
        />
      )}

      {balance && (
        <CashPosition
          cashInSafeGBP={balance.cash_in_safe_gbp}
          openingGBP={balance.opening_gbp}
          yesterday={yesterdayDate()}
          collectedTodayGBP={collectedToday.totalGBP}
          depositsToday={collectedToday.count}
          agentDebtGBP={agentDebtGBP}
          agentDebtUSD={agentDebtUSD}
          owingAgents={owingAgents}
          onSaveCashInSafe={(next) => patchBalance({ cash_in_safe_gbp: next })}
        />
      )}

      <div className={styles.split}>
        <NeedsAttention />
        {orgId && <CollectionMetrics orgId={orgId} />}
      </div>

      <div className={styles.split}>
        <ActivityFeed rows={activity} loading={loadingActivity} />
        {balance && orgId && (
          <OfficeSettings>
            <EditableStatCard
              variant="row"
              label="System limit"
              value={balance.system_limit_usd}
              currency="USD"
              editable
              onSave={(next) => patchBalance({ system_limit_usd: next })}
            />
            <BankDetailsCard
              bankName={bankDetails.bank_name}
              sortCode={bankDetails.sort_code}
              accountNumber={bankDetails.account_number}
              editable={userRole === "admin"}
              orgId={orgId}
              onSaved={(data) =>
                setBankDetails({
                  bank_name: data.bank_name,
                  sort_code: data.sort_code,
                  account_number: data.account_number,
                })
              }
            />
          </OfficeSettings>
        )}
      </div>
    </div>
  );
}
