"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  SettlementForm,
  type SettlementFormValues,
} from "@/components/settlement/SettlementForm";
import { ConversionPreviewCard } from "@/components/settlement/ConversionPreviewCard";
import { SettlementConfirmModal } from "@/components/settlement/SettlementConfirmModal";
import type { SettlementAgent } from "@/components/settlement/types";
import { useToast } from "@/components/ui/toast";
import {
  calculateSettlement,
  formatCurrency,
  toDateString,
} from "@/lib/utils";
import styles from "./settlement.module.css";

const EMPTY_FORM: SettlementFormValues = {
  agentId: null,
  receivedGBP: "",
  receiptNumber: "",
  notes: "",
};

function SettlementPageInner() {
  const searchParams = useSearchParams();
  const preselectId = searchParams.get("agentId");
  const { toast } = useToast();

  const [agents, setAgents] = useState<SettlementAgent[]>([]);
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<SettlementFormValues>(EMPTY_FORM);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = toDateString();

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const [{ data: agentRows }, { data: rateRow }] = await Promise.all([
      supabase
        .from("agents")
        .select("id, name, city, balance_usd, status")
        .eq("status", "active")
        .order("name", { ascending: true }),
      supabase
        .from("daily_rates")
        .select("gbp_to_usd")
        .eq("date", today)
        .maybeSingle(),
    ]);

    setAgents(
      (agentRows ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        city: r.city,
        balance_usd: Number(r.balance_usd),
      }))
    );
    setRate(rateRow ? Number(rateRow.gbp_to_usd) : null);
    setLoading(false);
  }, [today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Pre-select agent from URL once agents have loaded
  useEffect(() => {
    if (!preselectId || form.agentId) return;
    const match = agents.find((a) => a.id === preselectId);
    if (match) {
      setForm((f) => ({ ...f, agentId: match.id }));
    }
  }, [preselectId, agents, form.agentId]);

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === form.agentId) ?? null,
    [agents, form.agentId]
  );

  const receivedGBP = Number(form.receivedGBP) || 0;

  function openConfirm() {
    setError(null);
    if (!selectedAgent || !rate) return;
    setConfirmOpen(true);
  }

  async function confirm() {
    if (!selectedAgent || !rate) return;
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const calc = calculateSettlement(
      selectedAgent.balance_usd,
      receivedGBP,
      rate
    );

    // 1) Insert settlement row
    const { error: insertError } = await supabase.from("settlements").insert({
      agent_id: selectedAgent.id,
      date: today,
      amount_received_gbp: receivedGBP,
      rate_used: rate,
      amount_usd_equivalent: calc.usdEquivalent,
      new_agent_balance_usd: calc.newBalance,
      receipt_number: form.receiptNumber.trim(),
      recorded_by: user?.id ?? null,
      notes: form.notes.trim() || null,
    });

    if (insertError) {
      setSubmitting(false);
      setError(insertError.message);
      setConfirmOpen(false);
      return;
    }

    // 2) Update agent balance + last_settlement
    const { error: updateError } = await supabase
      .from("agents")
      .update({
        balance_usd: calc.newBalance,
        last_settlement: today,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedAgent.id);

    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      setConfirmOpen(false);
      return;
    }

    // 3) Toast + 4) reset form
    toast({
      title: `${selectedAgent.name}'s balance updated`,
      description: `${formatCurrency(
        calc.isOverpayment ? 0 : calc.newBalance,
        "USD"
      )} remaining`,
    });

    setConfirmOpen(false);
    setForm(EMPTY_FORM);
    loadData();
  }

  return (
    <div>
      <PageHeader
        title="Record settlement"
        description="Log cash received from an agent. Today's rate is applied automatically."
      />

      <div className={styles.layout}>
        <div className={styles.left}>
          {loading ? (
            <p>Loading…</p>
          ) : (
            <SettlementForm
              agents={agents}
              values={form}
              onChange={setForm}
              onSubmit={openConfirm}
              errorMessage={error}
              submitting={submitting}
              rateMissing={!rate}
            />
          )}
        </div>

        <div className={styles.right}>
          <ConversionPreviewCard
            agent={selectedAgent}
            receivedGBP={receivedGBP}
            rate={rate}
          />
        </div>
      </div>

      <SettlementConfirmModal
        open={confirmOpen}
        agent={selectedAgent}
        receivedGBP={receivedGBP}
        rate={rate ?? 0}
        receiptNumber={form.receiptNumber}
        notes={form.notes}
        submitting={submitting}
        onConfirm={confirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

// Page wraps inner component in Suspense because useSearchParams requires it.
export default function SettlementPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <SettlementPageInner />
    </Suspense>
  );
}
