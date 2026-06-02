"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CollectionCompany } from "./types";
import styles from "./ManageCompaniesModal.module.css";

const PAGE_SIZE = 20;

interface ManageCompaniesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: CollectionCompany[];
  onRemove: (id: string) => void | Promise<void>;
  onRemoved: () => void;
}

export function ManageCompaniesModal({
  open,
  onOpenChange,
  companies,
  onRemove,
  onRemoved,
}: ManageCompaniesModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setCurrentPage(1);
      setConfirmRemoveId(null);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(q));
  }, [companies, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearchChange(val: string) {
    setSearchQuery(val);
    setCurrentPage(1);
  }

  async function handleRemoveClick(id: string) {
    if (confirmRemoveId === id) {
      setConfirmRemoveId(null);
      await onRemove(id);
      onRemoved();
    } else {
      setConfirmRemoveId(id);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.content}>
        <DialogHeader>
          <DialogTitle>Manage Collection Companies</DialogTitle>
        </DialogHeader>

        <div className={styles.searchRow}>
          <Input
            placeholder="Search companies…"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {paginated.length === 0 ? (
          <div className={styles.empty}>No companies found.</div>
        ) : (
          <div className={styles.list}>
            {paginated.map((c) => (
              <div key={c.id} className={styles.companyRow}>
                <span className={styles.companyName}>{c.name}</span>
                <Button
                  size="sm"
                  variant={confirmRemoveId === c.id ? "destructive" : "outline"}
                  onClick={() => handleRemoveClick(c.id)}
                  onBlur={() => setConfirmRemoveId(null)}
                >
                  {confirmRemoveId === c.id ? "Confirm?" : "Remove"}
                </Button>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className={styles.pageInfo}>
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
