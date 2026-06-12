"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import styles from "./AgentDebtCard.module.css";

interface AgentDebtCardProps {
  totalAgentDebtGBP: number;
}

export function AgentDebtCard({ totalAgentDebtGBP }: AgentDebtCardProps) {
  return (
    <Card className={styles.card}>
      <CardHeader>
        <CardTitle className={styles.label}>Total Agent Debt</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={styles.value}>
          {formatCurrency(totalAgentDebtGBP, "GBP")}
        </div>
      </CardContent>
    </Card>
  );
}
