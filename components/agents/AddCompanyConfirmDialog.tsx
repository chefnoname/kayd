"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import styles from "./AddCompanyConfirmDialog.module.css";

interface AddCompanyConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  onConfirm: () => void;
  loading: boolean;
}

export function AddCompanyConfirmDialog({
  open,
  onOpenChange,
  companyName,
  onConfirm,
  loading,
}: AddCompanyConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add collection company</DialogTitle>
        </DialogHeader>
        <p className={styles.message}>
          Add &ldquo;{companyName}&rdquo; as a collection company?
        </p>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? "Adding…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
