"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatUSD } from "@/lib/utils";
import type { Deposit, DepositFilter } from "./types";
import styles from "./DepositTable.module.css";

interface DepositTableProps {
  deposits: Deposit[];
  filter: DepositFilter;
  onFilterChange: (f: DepositFilter) => void;
  onRelease: (d: Deposit) => void;
  onEdit: (d: Deposit) => void;
}

const FILTERS: { key: DepositFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "held", label: "Held" },
  { key: "released", label: "Released" },
];

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function DepositTable({
  deposits,
  filter,
  onFilterChange,
  onRelease,
  onEdit,
}: DepositTableProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.tabs} role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            className={`${styles.tab} ${
              filter === f.key ? styles.tabActive : ""
            }`}
            onClick={() => onFilterChange(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className={styles.tableCard}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Holder name</TableHead>
              <TableHead className={styles.numericHead}>Amount (USD)</TableHead>
              <TableHead>Date received</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className={styles.actionsHead}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deposits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className={styles.empty}>
                  No deposits recorded yet
                </TableCell>
              </TableRow>
            ) : (
              deposits.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className={styles.holder}>
                    {d.holder_name}
                  </TableCell>
                  <TableCell className={styles.numeric}>
                    {formatUSD(d.amount_usd)}
                  </TableCell>
                  <TableCell>{formatDate(d.date_received)}</TableCell>
                  <TableCell>{d.location || "—"}</TableCell>
                  <TableCell>
                    {d.status === "held" ? (
                      <Badge className={styles.badgeHeld}>Held</Badge>
                    ) : (
                      <Badge className={styles.badgeReleased}>Released</Badge>
                    )}
                  </TableCell>
                  <TableCell className={styles.notes}>
                    {d.notes || "—"}
                  </TableCell>
                  <TableCell>
                    <div className={styles.actions}>
                      {d.status === "held" && (
                        <Button
                          size="sm"
                          onClick={() => onRelease(d)}
                          className={styles.releaseBtn}
                        >
                          Release
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit(d)}
                        disabled={d.status === "released"}
                      >
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
