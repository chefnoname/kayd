"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import styles from "./ActivityFeed.module.css";

export interface ActivityRow {
  id: string;
  agent_name: string;
  amount_received_gbp: number;
  amount_usd_equivalent: number;
  receipt_number: string | null;
  created_at: string;
}

interface ActivityFeedProps {
  rows: ActivityRow[];
  loading?: boolean;
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function ActivityFeed({ rows, loading }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className={styles.title}>Today's Activity</CardTitle>
      </CardHeader>
      <CardContent className={styles.content}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Converted</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Receipt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} className={styles.muted}>
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className={styles.muted}>
                  No settlements recorded yet today
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className={styles.name}>{r.agent_name}</TableCell>
                <TableCell>
                  {formatCurrency(r.amount_received_gbp, "GBP")}
                </TableCell>
                <TableCell>
                  {formatCurrency(r.amount_usd_equivalent, "USD")}
                </TableCell>
                <TableCell>{formatTime(r.created_at)}</TableCell>
                <TableCell>{r.receipt_number ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
