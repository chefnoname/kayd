"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { UNCOLLECTED_BALANCE_THRESHOLD } from "@/lib/constants";
import styles from "./HighBalanceWarningDialog.module.css";

interface HighBalanceWarningDialogProps {
  agents: { id: string; name: string; balance_usd: number }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HighBalanceWarningDialog({
  agents,
  open,
  onOpenChange,
}: HighBalanceWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <span className={styles.titleRow}>
              <AlertTriangle size={20} className={styles.icon} />
              High Balance Warning
            </span>
          </DialogTitle>
          <DialogDescription>
            The following agents have uncollected balances at or above {`$${UNCOLLECTED_BALANCE_THRESHOLD.toLocaleString()}`}.
          </DialogDescription>
        </DialogHeader>
        <div className={styles.list}>
          {agents.map((agent) => (
            <div key={agent.id} className={styles.row}>
              <span className={styles.agentName}>{agent.name}</span>
              <span className={styles.balance}>
                {formatCurrency(agent.balance_usd, "USD")}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
