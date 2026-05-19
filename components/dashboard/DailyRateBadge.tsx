"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import styles from "./DailyRateBadge.module.css";

interface DailyRateBadgeProps {
  rate: number | null;
}

export function DailyRateBadge({ rate }: DailyRateBadgeProps) {
  if (!rate) {
    return (
      <Link href="/setup" className={styles.warning}>
        <AlertTriangle size={14} />
        <span>No rate set — set it now</span>
      </Link>
    );
  }
  return (
    <Badge className={styles.badge}>
      Today's rate: £1 = ${rate.toFixed(4)}
    </Badge>
  );
}
