"use client";

import Link from "next/link";
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
    <section className={styles.card} aria-labelledby="activity-title">
      <div className={styles.head}>
        <h2 id="activity-title" className={styles.title}>
          Today&apos;s activity
        </h2>
        <Link href="/agent-deposits" className={styles.link}>
          All agent deposits
        </Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agent</TableHead>
            <TableHead>Time</TableHead>
            <TableHead className={styles.num}>Received</TableHead>
            <TableHead className={styles.num}>Converted</TableHead>
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
                No agent deposits recorded yet today
              </TableCell>
            </TableRow>
          )}
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className={styles.name}>{r.agent_name}</TableCell>
              <TableCell className={styles.time}>
                {formatTime(r.created_at)}
              </TableCell>
              <TableCell className={styles.num}>
                {formatCurrency(r.amount_received_gbp, "GBP")}
              </TableCell>
              <TableCell className={styles.num}>
                {formatCurrency(r.amount_usd_equivalent, "USD")}
              </TableCell>
              <TableCell className={styles.time}>
                {r.receipt_number ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
