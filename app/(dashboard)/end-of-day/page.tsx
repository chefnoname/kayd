"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getOrganisationId } from "@/lib/org";
import { PageHeader } from "@/components/shared/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EODSummaryPanel } from "@/components/eod/EODSummaryPanel";
import { ClosingBalanceInput } from "@/components/eod/ClosingBalanceInput";
import { ReconciliationResult } from "@/components/eod/ReconciliationResult";
import { CloseDayButton } from "@/components/eod/CloseDayButton";
import { AlreadyClosedState } from "@/components/eod/AlreadyClosedState";
import type { EODBalance } from "@/components/eod/types";
import {
  calculateDiscrepancy,
  reconcileDay,
  toDateString,
  usdToGbp,
} from "@/lib/utils";
import styles from "./eod.module.css";

export default function EndOfDayPage() {
  const today = toDateString();

  const [balance, setBalance] = useState<EODBalance | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [collectionsGBP, setCollectionsGBP] = useState(0);
  const [agentDebtGBP, setAgentDebtGBP] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [counted, setCounted] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const orgId = await getOrganisationId();
    if (!orgId) {
      setError("Your account is not attached to an organisation.");
      setLoading(false);
      return;
    }

    const [
      { data: balanceRow, error: balanceErr },
      { data: rateRow },
      { data: settlementRows },
      { data: agentRows },
    ] = await Promise.all([
      supabase
        .from("daily_balances")
        .select(
          "id, date, opening_gbp, cash_in_safe_gbp, collections_today_gbp, total_agent_debt_gbp, closing_gbp, discrepancy, is_closed, notes, closed_at"
        )
        .eq("organisation_id", orgId)
        .eq("date", today)
        .maybeSingle(),
      supabase
        .from("daily_rates")
        .select("gbp_to_usd")
        .eq("organisation_id", orgId)
        .eq("date", today)
        .maybeSingle(),
      supabase
        .from("settlements")
        .select("amount_received_gbp")
        .eq("organisation_id", orgId)
        .eq("date", today),
      supabase
        .from("agents")
        .select("balance_usd")
        .eq("organisation_id", orgId)
        .eq("status", "active"),
    ]);

    if (balanceErr) {
      setError(balanceErr.message);
      setLoading(false);
      return;
    }

    const todayRate = rateRow ? Number(rateRow.gbp_to_usd) : null;
    setRate(todayRate);

    const collections = (settlementRows ?? []).reduce(
      (sum: number, r: any) => sum + Number(r.amount_received_gbp),
      0
    );
    setCollectionsGBP(collections);

    const totalDebtUSD = (agentRows ?? []).reduce(
      (sum: number, r: any) => sum + Number(r.balance_usd),
      0
    );
    setAgentDebtGBP(todayRate ? usdToGbp(totalDebtUSD, todayRate) : 0);

    if (balanceRow) {
      const b: EODBalance = {
        id: balanceRow.id,
        date: balanceRow.date,
        opening_gbp: Number(balanceRow.opening_gbp),
        cash_in_safe_gbp: Number(balanceRow.cash_in_safe_gbp),
        collections_today_gbp: Number(balanceRow.collections_today_gbp),
        total_agent_debt_gbp: Number(balanceRow.total_agent_debt_gbp),
        closing_gbp: Number(balanceRow.closing_gbp),
        discrepancy: Number(balanceRow.discrepancy),
        is_closed: balanceRow.is_closed,
        notes: balanceRow.notes,
        closed_at: balanceRow.closed_at,
      };
      setBalance(b);
      if (b.is_closed) {
        setCounted(String(b.closing_gbp));
        setReason(b.notes ?? "");
      }
    } else {
      setBalance(null);
    }

    setLoading(false);
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  const reconciliation = useMemo(() => {
    if (!balance) return null;
    return reconcileDay(
      balance.opening_gbp,
      balance.cash_in_safe_gbp,
      collectionsGBP,
      agentDebtGBP
    );
  }, [balance, collectionsGBP, agentDebtGBP]);

  const countedNumeric = counted === "" ? null : Number(counted);
  const validCount =
    countedNumeric !== null &&
    Number.isFinite(countedNumeric) &&
    countedNumeric >= 0;

  const discrepancy =
    reconciliation && validCount
      ? calculateDiscrepancy(
          reconciliation.expectedClosingGBP,
          countedNumeric as number
        )
      : null;

  const reasonRequired = discrepancy?.hasDiscrepancy === true;
  const canClose =
    !!balance &&
    !balance.is_closed &&
    !!reconciliation &&
    validCount &&
    (!reasonRequired || reason.trim().length > 0);

  async function closeDay() {
    if (!balance || !reconciliation || !validCount) return;
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const orgId = await getOrganisationId();
    if (!orgId) {
      setSubmitting(false);
      setError("Your account is not attached to an organisation.");
      return;
    }
    const signedDiscrepancy = discrepancy
      ? discrepancy.direction === "over"
        ? discrepancy.amount
        : discrepancy.direction === "under"
          ? -discrepancy.amount
          : 0
      : 0;

    const { error: updateError } = await supabase
      .from("daily_balances")
      .update({
        closing_gbp: countedNumeric,
        collections_today_gbp: collectionsGBP,
        total_agent_debt_gbp: agentDebtGBP,
        discrepancy: signedDiscrepancy,
        is_closed: true,
        notes: reasonRequired ? reason.trim() : null,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("organisation_id", orgId)
      .eq("id", balance.id);

    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await load();
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="End of day"
        description="Reconcile today's cash and lock the day."
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && <p>Loading…</p>}

      {!loading && !balance && (
        <Alert variant="destructive">
          <AlertDescription>
            No daily balance has been initialised for today. Visit the
            dashboard once to seed it.
          </AlertDescription>
        </Alert>
      )}

      {!loading && balance && balance.is_closed && (
        <AlreadyClosedState
          closedAt={balance.closed_at}
          closingGBP={balance.closing_gbp}
          discrepancy={balance.discrepancy}
          notes={balance.notes}
        />
      )}

      {!loading && balance && reconciliation && (
        <EODSummaryPanel
          openingGBP={balance.opening_gbp}
          cashInSafeGBP={balance.cash_in_safe_gbp}
          collectionsGBP={collectionsGBP}
          agentDebtGBP={agentDebtGBP}
          expectedGBP={reconciliation.expectedClosingGBP}
          formula={reconciliation.formula}
        />
      )}

      {!loading && balance && !balance.is_closed && reconciliation && (
        <>
          {!rate && (
            <Alert variant="destructive">
              <AlertDescription>
                Today's GBP→USD rate is not set. Agent debt is being treated as
                £0 — set the rate in Daily Setup before closing.
              </AlertDescription>
            </Alert>
          )}

          <div className={styles.inputsRow}>
            <ClosingBalanceInput
              value={counted}
              onChange={setCounted}
              disabled={submitting}
            />
            <ReconciliationResult
              expectedGBP={reconciliation.expectedClosingGBP}
              actualGBP={validCount ? (countedNumeric as number) : null}
              reason={reason}
              onReasonChange={setReason}
              disabled={submitting}
            />
          </div>

          <CloseDayButton
            disabled={!canClose || submitting}
            submitting={submitting}
            expectedGBP={reconciliation.expectedClosingGBP}
            actualGBP={validCount ? (countedNumeric as number) : 0}
            discrepancyAmount={discrepancy?.amount ?? 0}
            discrepancyDirection={discrepancy?.direction ?? "balanced"}
            reason={reason.trim()}
            onConfirm={closeDay}
          />
        </>
      )}
    </div>
  );
}
