"use client";

import { Fragment } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatCurrency,
  formatLongDate,
  usdToGbp,
} from "@/lib/utils";
import { AgentDetailPanel } from "./AgentDetailPanel";
import type { Agent } from "./types";
import styles from "./AgentTable.module.css";

interface AgentTableProps {
  agents: Agent[];
  todayRate: number | null;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onEditAgent: (agent: Agent) => void;
  onAddAgent: () => void;
}

function balanceVariant(
  balance: number
): "default" | "secondary" | "destructive" {
  if (balance === 0) return "secondary"; // green via custom class
  if (balance > 10000) return "destructive";
  return "default"; // amber via custom class
}

function balanceClass(balance: number): string {
  if (balance === 0) return styles.green;
  if (balance > 10000) return styles.red;
  return styles.amber;
}

export function AgentTable({
  agents,
  todayRate,
  expandedId,
  onToggleExpand,
  onEditAgent,
  onAddAgent,
}: AgentTableProps) {
  const router = useRouter();

  if (agents.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No agents found</p>
        <Button onClick={onAddAgent}>Add Agent</Button>
      </div>
    );
  }

  return (
    <div className={styles.tableWrap}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agent Name</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Owes (USD)</TableHead>
            <TableHead>GBP Equivalent</TableHead>
            <TableHead>Last Settlement</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className={styles.actionHead}>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent) => {
            const inactive = agent.status === "inactive";
            const gbpEquivalent =
              todayRate && todayRate > 0
                ? usdToGbp(agent.balance_usd, todayRate)
                : null;
            const isExpanded = expandedId === agent.id;

            return (
              <Fragment key={agent.id}>
                <TableRow
                  onClick={() => onToggleExpand(agent.id)}
                  className={`${styles.row} ${inactive ? styles.inactive : ""} ${
                    isExpanded ? styles.expanded : ""
                  }`}
                  data-state={isExpanded ? "selected" : undefined}
                >
                  <TableCell className={styles.nameCell}>
                    {agent.name}
                  </TableCell>
                  <TableCell>{agent.city}</TableCell>
                  <TableCell>
                    <Badge
                      variant={balanceVariant(agent.balance_usd)}
                      className={balanceClass(agent.balance_usd)}
                    >
                      {formatCurrency(agent.balance_usd, "USD")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {gbpEquivalent !== null
                      ? formatCurrency(gbpEquivalent, "GBP")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {agent.last_settlement
                      ? formatLongDate(new Date(agent.last_settlement))
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`${styles.statusPill} ${
                        inactive ? styles.statusInactive : styles.statusActive
                      }`}
                    >
                      {agent.status}
                    </span>
                  </TableCell>
                  <TableCell className={styles.actionCell}>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/settlement?agentId=${agent.id}`);
                      }}
                    >
                      Settle
                    </Button>
                  </TableCell>
                </TableRow>

                {isExpanded && (
                  <TableRow className={styles.detailRow}>
                    <TableCell colSpan={7} className={styles.detailCell}>
                      <AgentDetailPanel
                        agent={agent}
                        onSettle={() =>
                          router.push(`/settlement?agentId=${agent.id}`)
                        }
                        onEdit={() => onEditAgent(agent)}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

