"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getOrganisationId } from "@/lib/org";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatLongDate } from "@/lib/utils";
import type { Agent, AgentDepositRow } from "./types";
import styles from "./AgentDetailPanel.module.css";

interface AgentDetailPanelProps {
  agent: Agent;
  onSettle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function AgentDetailPanel({
  agent,
  onSettle,
  onEdit,
  onDelete,
}: AgentDetailPanelProps) {
  const [rows, setRows] = useState<AgentDepositRow[] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const orgId = await getOrganisationId();
      if (!orgId) {
        if (!cancelled) setRows([]);
        return;
      }
      const { data } = await supabase
        .from("agent_deposits")
        .select(
          "id, agent_id, date, amount_received_gbp, amount_usd_equivalent, rate_used, receipt_number, recorded_by, staff_users:recorded_by ( name )"
        )
        .eq("organisation_id", orgId)
        .eq("agent_id", agent.id)
        .order("date", { ascending: false })
        .limit(7);

      if (cancelled) return;

      const mapped: AgentDepositRow[] = (data ?? []).map((r: any) => ({
        id: r.id,
        agent_id: r.agent_id,
        date: r.date,
        amount_received_gbp: Number(r.amount_received_gbp),
        amount_usd_equivalent: Number(r.amount_usd_equivalent),
        rate_used: Number(r.rate_used),
        receipt_number: r.receipt_number,
        recorded_by: r.recorded_by,
        recorded_by_name: r.staff_users?.name ?? null,
      }));
      setRows(mapped);
    })();

    return () => {
      cancelled = true;
    };
  }, [agent.id]);

  return (
    <div className={styles.panel}>
      <div className={styles.grid}>
        <div>
          <div className={styles.label}>Full name</div>
          <div className={styles.value}>{agent.name}</div>
        </div>
        <div>
          <div className={styles.label}>City</div>
          <div className={styles.value}>{agent.city}</div>
        </div>
        <div>
          <div className={styles.label}>Phone</div>
          <div className={styles.value}>{agent.phone ?? "—"}</div>
        </div>
        <div>
          <div className={styles.label}>Status</div>
          <div className={styles.value}>{agent.status}</div>
        </div>
        <div>
          <div className={styles.label}>Outstanding</div>
          <div className={styles.value}>
            {formatCurrency(agent.balance_usd, "USD")}
          </div>
        </div>
        <div>
          <div className={styles.label}>Last agent deposit</div>
          <div className={styles.value}>
            {agent.last_agent_deposit
              ? formatLongDate(new Date(agent.last_agent_deposit))
              : "Never"}
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Recent agent deposits</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Converted</TableHead>
              <TableHead>Receipt No.</TableHead>
              <TableHead>Recorded By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows === null && (
              <TableRow>
                <TableCell colSpan={6} className={styles.muted}>
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {rows && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className={styles.muted}>
                  No agent deposits recorded yet.
                </TableCell>
              </TableRow>
            )}
            {rows?.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{formatLongDate(new Date(r.date))}</TableCell>
                <TableCell>
                  {formatCurrency(r.amount_received_gbp, "GBP")}
                </TableCell>
                <TableCell className={styles.rateCell}>
                  {r.rate_used.toFixed(4)}
                </TableCell>
                <TableCell>
                  {formatCurrency(r.amount_usd_equivalent, "USD")}
                </TableCell>
                <TableCell>{r.receipt_number ?? "—"}</TableCell>
                <TableCell>{r.recorded_by_name ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className={styles.actions}>
        <Button onClick={onSettle}>Record Agent Deposit</Button>
        <Button variant="outline" onClick={onEdit}>
          Edit Agent
        </Button>
        {confirmDelete ? (
          <div className={styles.deleteConfirm}>
            <span className={styles.deleteWarn}>Permanently delete this agent? This cannot be undone.</span>
            <Button
              variant="destructive"
              onClick={() => { setConfirmDelete(false); onDelete(); }}
            >
              Confirm Delete
            </Button>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className={styles.deleteBtn}
            onClick={() => setConfirmDelete(true)}
          >
            Delete Agent
          </Button>
        )}
      </div>
    </div>
  );
}
