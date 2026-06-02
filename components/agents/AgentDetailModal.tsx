"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AgentDetailPanel } from "./AgentDetailPanel";
import type { Agent } from "./types";
import styles from "./AgentDetailModal.module.css";

interface AgentDetailModalProps {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function AgentDetailModal({
  agent,
  open,
  onOpenChange,
  onSettle,
  onEdit,
  onDelete,
}: AgentDetailModalProps) {
  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.content}>
        <DialogHeader>
          <DialogTitle>{agent.name}</DialogTitle>
        </DialogHeader>
        <AgentDetailPanel
          agent={agent}
          onSettle={onSettle}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </DialogContent>
    </Dialog>
  );
}
