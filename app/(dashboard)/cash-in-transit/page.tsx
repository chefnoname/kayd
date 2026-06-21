"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getOrganisationId } from "@/lib/org";
import { toDateString } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { CITCollectionForm } from "@/components/cash-in-transit/CITCollectionForm";
import { CITHistoryTable } from "@/components/cash-in-transit/CITHistoryTable";
import { CollectionCompanyList } from "@/components/agents/CollectionCompanyList";
import type { CITCollection, BranchOffice } from "@/components/cash-in-transit/types";
import type { CollectionCompany } from "@/components/agents/types";
import styles from "./cash-in-transit.module.css";

export default function CashInTransitPage() {
  const [collections, setCollections] = useState<CITCollection[]>([]);
  const [companies, setCompanies] = useState<CollectionCompany[]>([]);
  const [branches, setBranches] = useState<BranchOffice[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [todaySendRate, setTodaySendRate] = useState<number | null>(null);
  const [todayReceiveRate, setTodayReceiveRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const org = await getOrganisationId();
    if (!org) {
      setLoading(false);
      return;
    }
    setOrgId(org);

    const [
      { data: citRows },
      { data: companyRows },
      { data: branchRows },
      { data: rateRows },
    ] = await Promise.all([
      supabase
        .from("cit_collections")
        .select(
          "id, date, company_id, company_name, hq_sale_rate, receive_rate, amount_usd, branch_office_id, branch_name, brought_to_hq, courier_notes, logged_by, created_at"
        )
        .eq("organisation_id", org)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("collection_companies")
        .select("id, name")
        .eq("organisation_id", org)
        .order("name"),
      supabase
        .from("regional_offices")
        .select("id, name")
        .eq("organisation_id", org)
        .order("name"),
      supabase
        .from("rate_entries")
        .select("date, send_rate, receive_rate")
        .eq("organisation_id", org)
        .order("date", { ascending: false }),
    ]);

    // Build date → receive_rate lookup (latest entry per date)
    const rateByDate: Record<string, number> = {};
    for (const r of rateRows ?? []) {
      if (!rateByDate[r.date]) {
        rateByDate[r.date] = Number(r.receive_rate);
      }
    }

    // Capture today's rates for the form
    const today = toDateString();
    const todayEntry = (rateRows ?? []).find((r: any) => r.date === today);
    setTodaySendRate(todayEntry ? Number(todayEntry.send_rate) : null);
    setTodayReceiveRate(todayEntry ? Number(todayEntry.receive_rate) : null);

    setCompanies(companyRows ?? []);
    setBranches(
      (branchRows ?? []).map((b: any) => ({ id: b.id, name: b.name }))
    );

    // Resolve staff names in a separate batch query (logged_by FK → auth.users, not staff_users)
    const loggerIds = [
      ...new Set(
        (citRows ?? []).map((c: any) => c.logged_by).filter(Boolean)
      ),
    ] as string[];

    const nameMap: Record<string, string> = {};
    if (loggerIds.length > 0) {
      const { data: staffRows } = await supabase
        .from("staff_users")
        .select("id, name")
        .in("id", loggerIds);
      for (const s of staffRows ?? []) {
        if (s.name) nameMap[s.id] = s.name;
      }
    }

    setCollections(
      (citRows ?? []).map((c: any) => {
        // Prefer stored receive_rate; fall back to rate_entries lookup for older rows
        const recRate = c.receive_rate != null ? Number(c.receive_rate) : (rateByDate[c.date] ?? null);
        const hqRate = Number(c.hq_sale_rate);
        const amt = Number(c.amount_usd);
        let profitLoss: number | null = null;
        if (recRate != null) {
          profitLoss = Math.round((hqRate - recRate) * amt * 100) / 100;
        }

        return {
          id: c.id,
          date: c.date,
          company_id: c.company_id,
          company_name: c.company_name,
          hq_sale_rate: hqRate,
          amount_usd: amt,
          branch_office_id: c.branch_office_id,
          branch_name: c.branch_name,
          brought_to_hq: c.brought_to_hq,
          courier_notes: c.courier_notes,
          logged_by: c.logged_by,
          logged_by_name: nameMap[c.logged_by] ?? null,
          created_at: c.created_at,
          agent_rate: recRate,
          profit_loss: profitLoss,
        };
      })
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className={styles.page}>
      <PageHeader
        title="HQ Collections"
        description="Track HQ collections via cash-in-transit companies and compare against agent rates."
      />

      <div className={styles.sections}>
        {orgId && (
          <CITCollectionForm
            companies={companies}
            branches={branches}
            orgId={orgId}
            onSubmitted={load}
            todaySendRate={todaySendRate}
            todayReceiveRate={todayReceiveRate}
          />
        )}

        <CITHistoryTable collections={collections} loading={loading} />

        <CollectionCompanyList />
      </div>
    </div>
  );
}
