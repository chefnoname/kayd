"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getOrganisationId } from "@/lib/org";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DepositSummaryCards } from "@/components/deposits/DepositSummaryCards";
import { DepositTable } from "@/components/deposits/DepositTable";
import { AddDepositModal } from "@/components/deposits/AddDepositModal";
import { EditDepositModal } from "@/components/deposits/EditDepositModal";
import { ReleaseDepositModal } from "@/components/deposits/ReleaseDepositModal";
import type { Deposit, DepositFilter } from "@/components/deposits/types";
import styles from "./deposits.module.css";

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [filter, setFilter] = useState<DepositFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Deposit | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<Deposit | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const orgId = await getOrganisationId();
    if (!orgId) {
      setDeposits([]);
      setLoading(false);
      return;
    }
    const { data, error: fetchError } = await supabase
      .from("individual_deposits")
      .select(
        "id, holder_name, amount_usd, date_received, location, notes, status, released_at, released_to, created_at, created_by"
      )
      .eq("organisation_id", orgId)
      .order("date_received", { ascending: false })
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setDeposits([]);
    } else {
      // Resolve recorder names from staff_users in one batch query
      const creatorIds = [
        ...new Set(
          (data ?? []).map((d: any) => d.created_by).filter(Boolean)
        ),
      ] as string[];

      const nameMap: Record<string, string> = {};
      if (creatorIds.length > 0) {
        const { data: staffRows } = await supabase
          .from("staff_users")
          .select("id, name")
          .in("id", creatorIds);
        for (const s of staffRows ?? []) {
          if (s.name) nameMap[s.id] = s.name;
        }
      }

      setDeposits(
        (data ?? []).map((d: any) => ({
          id: d.id,
          holder_name: d.holder_name,
          amount_usd: Number(d.amount_usd),
          date_received: d.date_received,
          location: d.location,
          notes: d.notes,
          status: d.status,
          released_at: d.released_at,
          released_to: d.released_to,
          created_at: d.created_at,
          recorded_by: d.created_by ? (nameMap[d.created_by] ?? null) : null,
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { totalHeldUSD, activeCount } = useMemo(() => {
    const held = deposits.filter((d) => d.status === "held");
    return {
      totalHeldUSD: held.reduce((s, d) => s + d.amount_usd, 0),
      activeCount: held.length,
    };
  }, [deposits]);

  const filtered = useMemo(() => {
    if (filter === "all") return deposits;
    return deposits.filter((d) => d.status === filter);
  }, [deposits, filter]);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Deposit ledger"
        description="Money held on behalf of individuals."
        actions={
          <Button onClick={() => setAddOpen(true)}>Add deposit</Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DepositSummaryCards
        totalHeldUSD={totalHeldUSD}
        activeCount={activeCount}
      />

      {loading ? (
        <p>Loading…</p>
      ) : (
        <DepositTable
          deposits={filtered}
          filter={filter}
          onFilterChange={setFilter}
          onRelease={(d) => setReleaseTarget(d)}
          onEdit={(d) => setEditTarget(d)}
        />
      )}

      <AddDepositModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={load}
      />

      <EditDepositModal
        open={editTarget !== null}
        onOpenChange={(v) => {
          if (!v) setEditTarget(null);
        }}
        deposit={editTarget}
        onUpdated={load}
      />

      <ReleaseDepositModal
        open={releaseTarget !== null}
        onOpenChange={(v) => {
          if (!v) setReleaseTarget(null);
        }}
        deposit={releaseTarget}
        onReleased={load}
      />
    </div>
  );
}
