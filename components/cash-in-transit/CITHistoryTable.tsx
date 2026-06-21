"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatLongDate } from "@/lib/utils";
import type { CITCollection } from "./types";
import styles from "./CITHistoryTable.module.css";

interface CITHistoryTableProps {
  collections: CITCollection[];
  loading: boolean;
}

export function CITHistoryTable({
  collections,
  loading,
}: CITHistoryTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Collection History</CardTitle>
      </CardHeader>
      <CardContent className={styles.content}>
        <div className={styles.tableWrap}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead className={styles.numericHead}>Amount</TableHead>
                <TableHead className={styles.numericHead}>HQ Rate</TableHead>
                <TableHead className={styles.numericHead}>Receive Rate</TableHead>
                <TableHead className={styles.numericHead}>P/L</TableHead>
                <TableHead>Courier / Notes</TableHead>
                <TableHead>Logged By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={9} className={styles.muted}>
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!loading && collections.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className={styles.muted}>
                    No collections logged yet.
                  </TableCell>
                </TableRow>
              )}
              {collections.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {formatLongDate(new Date(c.date))}
                  </TableCell>
                  <TableCell className={styles.nameCell}>
                    {c.company_name}
                  </TableCell>
                  <TableCell>{c.branch_name}</TableCell>
                  <TableCell className={styles.numeric}>
                    {formatCurrency(c.amount_usd, "USD")}
                  </TableCell>
                  <TableCell className={styles.numeric}>
                    {c.hq_sale_rate.toFixed(4)}
                  </TableCell>
                  <TableCell className={styles.numeric}>
                    {c.agent_rate != null ? c.agent_rate.toFixed(4) : "—"}
                  </TableCell>
                  <TableCell className={styles.numeric}>
                    <PLIndicator value={c.profit_loss} />
                  </TableCell>
                  <TableCell className={styles.notes}>
                    {c.courier_notes || "—"}
                  </TableCell>
                  <TableCell>{c.logged_by_name || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function PLIndicator({ value }: { value: number | null }) {
  if (value == null || Math.abs(value) < 0.005) {
    return <span className={styles.plNeutral}>{formatCurrency(0, "USD")}</span>;
  }
  if (value > 0) {
    return (
      <span className={styles.plProfit}>+{formatCurrency(value, "USD")}</span>
    );
  }
  return (
    <span className={styles.plLoss}>{formatCurrency(value, "USD")}</span>
  );
}
