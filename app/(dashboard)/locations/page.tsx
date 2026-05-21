"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getOrganisationId } from "@/lib/org";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LocationGrid } from "@/components/locations/LocationGrid";
import { AddLocationModal } from "@/components/locations/AddLocationModal";
import { LogCollectionModal } from "@/components/locations/LogCollectionModal";
import { LocationHistoryDrawer } from "@/components/locations/LocationHistoryDrawer";
import type { RegionalOffice } from "@/components/locations/types";
import { formatCurrency } from "@/lib/utils";
import styles from "./locations.module.css";

export default function LocationsPage() {
  const [offices, setOffices] = useState<RegionalOffice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [logTarget, setLogTarget] = useState<RegionalOffice | null>(null);
  const [historyTarget, setHistoryTarget] = useState<RegionalOffice | null>(
    null
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const orgId = await getOrganisationId();
    if (!orgId) {
      setOffices([]);
      setLoading(false);
      return;
    }
    const { data, error: fetchError } = await supabase
      .from("regional_offices")
      .select("id, name, cash_held_gbp, last_collection_date, created_at")
      .eq("organisation_id", orgId)
      .order("name", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setOffices([]);
    } else {
      setOffices(
        (data ?? []).map((o: any) => ({
          id: o.id,
          name: o.name,
          cash_held_gbp: Number(o.cash_held_gbp),
          last_collection_date: o.last_collection_date,
          created_at: o.created_at,
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalHeld = useMemo(
    () => offices.reduce((s, o) => s + o.cash_held_gbp, 0),
    [offices]
  );

  return (
    <div className={styles.page}>
      <PageHeader
        title="Regional offices"
        description="Cash held at each hub between collections."
        actions={
          <Button onClick={() => setAddOpen(true)}>Add office</Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className={styles.summaryCard}>
        <div>
          <div className={styles.summaryLabel}>
            Total held across all offices
          </div>
          <div className={styles.summaryValue}>
            {formatCurrency(totalHeld, "GBP")}
          </div>
        </div>
        <div className={styles.summaryHint}>
          {offices.length} office{offices.length === 1 ? "" : "s"} tracked
        </div>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <LocationGrid
          offices={offices}
          onLogCollection={(o) => setLogTarget(o)}
          onViewHistory={(o) => setHistoryTarget(o)}
        />
      )}

      <AddLocationModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={load}
      />

      <LogCollectionModal
        open={logTarget !== null}
        onOpenChange={(v) => {
          if (!v) setLogTarget(null);
        }}
        office={logTarget}
        onLogged={load}
      />

      <LocationHistoryDrawer
        open={historyTarget !== null}
        onOpenChange={(v) => {
          if (!v) setHistoryTarget(null);
        }}
        office={historyTarget}
      />
    </div>
  );
}
