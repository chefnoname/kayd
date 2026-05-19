"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import styles from "./AlertsBanner.module.css";

interface AlertsBannerProps {
  discrepancy: number;
  isClosed: boolean;
}

export function AlertsBanner({ discrepancy, isClosed }: AlertsBannerProps) {
  if (isClosed || !discrepancy || Math.abs(discrepancy) < 0.005) return null;

  return (
    <Link href="/end-of-day" className={styles.banner}>
      <AlertTriangle size={18} />
      <span>
        Discrepancy of{" "}
        <strong>{formatCurrency(Math.abs(discrepancy), "GBP")}</strong> flagged
        — review End of Day
      </span>
    </Link>
  );
}
