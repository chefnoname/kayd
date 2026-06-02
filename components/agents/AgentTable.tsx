"use client";

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
import { formatCurrency, formatLongDate, usdToGbp } from "@/lib/utils";
import type { Agent } from "./types";
import styles from "./AgentTable.module.css";

interface AgentTableProps {
  agents: Agent[];
  todayRate: number | null;
  onRowClick: (agent: Agent) => void;
  sortField: string | null;
  sortDir: "asc" | "desc";
  onSortChange: (field: string) => void;
  onEditAgent: (agent: Agent) => void;
  onAddAgent: () => void;
  onDeleteAgent: (agentId: string) => void;
}

function balanceVariant(
  balance: number
): "default" | "secondary" | "destructive" {
  if (balance === 0) return "secondary";
  if (balance > 10000) return "destructive";
  return "default";
}

function balanceClass(balance: number): string {
  if (balance === 0) return styles.green;
  if (balance > 10000) return styles.red;
  return styles.amber;
}

export function AgentTable({
  agents,
  todayRate,
  onRowClick,
  sortField,
  sortDir,
  onSortChange,
  onEditAgent,
  onAddAgent,
  onDeleteAgent,
}: AgentTableProps) {
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
            <TableHead>Agent Code</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Owes</TableHead>
            <TableHead>In GBP</TableHead>
            <TableHead
              className={styles.sortableHead}
              onClick={() => onSortChange("created_at")}
            >
              Date Added
              {sortField === "created_at" && (
                <span className={styles.sortArrow}>
                  {sortDir === "asc" ? "▲" : "▼"}
                </span>
              )}
            </TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent) => {
            const inactive = agent.status === "inactive";
            const gbpEquivalent =
              todayRate && todayRate > 0
                ? usdToGbp(agent.balance_usd, todayRate)
                : null;

            return (
              <TableRow
                key={agent.id}
                onClick={() => onRowClick(agent)}
                className={`${styles.row} ${inactive ? styles.inactive : ""}`}
              >
                <TableCell className={styles.nameCell}>{agent.name}</TableCell>
                <TableCell className={styles.nameCell}>
                  {agent.collection_company_name || "—"}
                </TableCell>
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
                  {formatLongDate(new Date(agent.created_at))}
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
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRowClick(agent);
                    }}
                  >
                    More Info
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
