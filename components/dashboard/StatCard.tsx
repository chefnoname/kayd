"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import styles from "./StatCard.module.css";

interface StatCardProps {
  label: string;
  displayValue: string;
}

export function StatCard({ label, displayValue }: StatCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className={styles.label}>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={styles.value}>{displayValue}</div>
      </CardContent>
    </Card>
  );
}
