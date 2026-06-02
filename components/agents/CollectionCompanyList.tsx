"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase";
import { getOrganisationId } from "@/lib/org";
import { AddCompanyConfirmDialog } from "./AddCompanyConfirmDialog";
import { ManageCompaniesModal } from "./ManageCompaniesModal";
import type { CollectionCompany } from "./types";
import styles from "./CollectionCompanyList.module.css";

export function CollectionCompanyList() {
  const [companies, setCompanies] = useState<CollectionCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [pendingName, setPendingName] = useState<string | null>(null);
  const [confirmAddOpen, setConfirmAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const orgId = await getOrganisationId();
    if (!orgId) {
      setCompanies([]);
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("collection_companies")
      .select("id, name")
      .eq("organisation_id", orgId)
      .order("name");

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setCompanies(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) return;
    setPendingName(trimmed);
    setConfirmAddOpen(true);
  }

  async function handleConfirmAdd() {
    if (!pendingName) return;
    setAdding(true);
    setError(null);

    const supabase = createClient();
    const orgId = await getOrganisationId();
    if (!orgId) {
      setAdding(false);
      return setError("Your account is not attached to an organisation.");
    }

    const { error: insertError } = await supabase
      .from("collection_companies")
      .insert({ organisation_id: orgId, name: pendingName });

    setAdding(false);
    if (insertError) {
      if (insertError.message.includes("duplicate") || insertError.code === "23505") {
        setError(`"${pendingName}" already exists.`);
      } else {
        setError(insertError.message);
      }
      setConfirmAddOpen(false);
      setPendingName(null);
      return;
    }

    setName("");
    setPendingName(null);
    setConfirmAddOpen(false);
    load();
  }

  async function handleRemove(id: string) {
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("collection_companies")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    load();
  }

  return (
    <Card className={styles.card}>
      <CardHeader>
        <CardTitle>Collection Companies</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAdd} className={styles.addRow}>
          <div className={styles.addInput}>
            <Input
              placeholder="Company name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={adding}
            />
          </div>
          <div className={styles.buttonGroup}>
            <Button type="submit" disabled={adding || !name.trim()}>
              {adding ? "Adding…" : "Add"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setManageOpen(true)}
              disabled={loading || companies.length === 0}
            >
              View Companies
            </Button>
          </div>
        </form>

        {error && (
          <Alert variant="destructive" className={styles.errorAlert}>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className={styles.loading}>Loading…</div>
        ) : companies.length === 0 ? (
          <div className={styles.empty}>No collection companies added yet.</div>
        ) : null}
      </CardContent>

      <AddCompanyConfirmDialog
        open={confirmAddOpen}
        onOpenChange={setConfirmAddOpen}
        companyName={pendingName ?? ""}
        onConfirm={handleConfirmAdd}
        loading={adding}
      />

      <ManageCompaniesModal
        open={manageOpen}
        onOpenChange={setManageOpen}
        companies={companies}
        onRemove={handleRemove}
        onRemoved={load}
      />
    </Card>
  );
}
