"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase";
import { getOrganisationId } from "@/lib/org";
import { formatCurrency } from "@/lib/utils";
import type { CollectionPickup, RegionalOffice } from "./types";
import styles from "./LocationHistoryDrawer.module.css";

interface LocationHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  office: RegionalOffice | null;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function LocationHistoryDrawer({
  open,
  onOpenChange,
  office,
}: LocationHistoryDrawerProps) {
  const [rows, setRows] = useState<CollectionPickup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !office) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const orgId = await getOrganisationId();
      if (!orgId) {
        if (!cancelled) {
          setRows([]);
          setLoading(false);
        }
        return;
      }
      const { data, error: fetchError } = await supabase
        .from("collection_pickups")
        .select("id, office_id, amount_gbp, date, collected_by_name, created_at, created_by")
        .eq("organisation_id", orgId)
        .eq("office_id", office.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setRows([]);
      } else {
        // Resolve recorder names in one batch
        const creatorIds = [
          ...new Set(
            (data ?? []).map((r: any) => r.created_by).filter(Boolean)
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

        setRows(
          (data ?? []).map((r: any) => ({
            id: r.id,
            office_id: r.office_id,
            amount_gbp: Number(r.amount_gbp),
            date: r.date,
            collected_by_name: r.collected_by_name,
            created_at: r.created_at,
            recorded_by: r.created_by ? (nameMap[r.created_by] ?? null) : null,
          }))
        );
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, office]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={styles.content}>
        <SheetHeader>
          <SheetTitle>{office ? office.name : "Collection history"}</SheetTitle>
          <SheetDescription>Last 10 collections from this office.</SheetDescription>
        </SheetHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className={styles.tableWrap}>
          {loading ? (
            <p className={styles.muted}>Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className={styles.numericHead}>Amount</TableHead>
                  <TableHead>Collected by</TableHead>
                  <TableHead>Recorded by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className={styles.empty}>
                      No collections recorded yet
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{formatDate(r.date)}</TableCell>
                      <TableCell className={styles.numeric}>
                        {formatCurrency(r.amount_gbp, "GBP")}
                      </TableCell>
                      <TableCell>{r.collected_by_name || "—"}</TableCell>
                      <TableCell>{r.recorded_by || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
