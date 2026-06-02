"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase";
import { getOrganisationId } from "@/lib/org";
import { formatCurrency, toDateString } from "@/lib/utils";
import type { RegionalOffice } from "./types";
import type { CollectionCompany } from "@/components/agents/types";
import styles from "./LocationModal.module.css";

interface LogCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  office: RegionalOffice | null;
  onLogged: () => void;
}

export function LogCollectionModal({
  open,
  onOpenChange,
  office,
  onLogged,
}: LogCollectionModalProps) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(toDateString());
  const [driver, setDriver] = useState("");
  const [companies, setCompanies] = useState<CollectionCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount("");
      setDate(toDateString());
      setDriver("");
      setSelectedCompanyId("");
      setError(null);
      setSaving(false);

      (async () => {
        const supabase = createClient();
        const orgId = await getOrganisationId();
        if (!orgId) return;
        const { data } = await supabase
          .from("collection_companies")
          .select("id, name")
          .eq("organisation_id", orgId)
          .order("name");
        setCompanies(data ?? []);
      })();
    }
  }, [open, office]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!office) return;
    setError(null);

    const amt = Number(amount);
    const driverName = driver.trim();

    if (!Number.isFinite(amt) || amt <= 0) {
      return setError("Amount must be greater than 0.");
    }
    if (amt > office.cash_held_gbp + 0.005) {
      return setError(
        `Amount exceeds cash held at this office (${formatCurrency(
          office.cash_held_gbp,
          "GBP"
        )}).`
      );
    }
    if (!date) return setError("Date is required.");
    if (!selectedCompanyId) return setError("Please select a collection company.");

    setSaving(true);
    const supabase = createClient();
    const orgId = await getOrganisationId();
    if (!orgId) {
      setSaving(false);
      return setError("Your account is not attached to an organisation.");
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertError } = await supabase
      .from("collection_pickups")
      .insert({
        organisation_id: orgId,
        office_id: office.id,
        amount_gbp: amt,
        date,
        collected_by_name: driverName,
        collection_company_id: selectedCompanyId || null,
        created_by: user?.id ?? null,
      });

    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }

    const newCash =
      Math.round((office.cash_held_gbp - amt) * 100) / 100;

    const { error: updateError } = await supabase
      .from("regional_offices")
      .update({
        cash_held_gbp: newCash,
        last_collection_date: date,
      })
      .eq("organisation_id", orgId)
      .eq("id", office.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onOpenChange(false);
    onLogged();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log collection</DialogTitle>
          <DialogDescription>
            Record cash picked up from this office.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className={styles.form}>
          {office && (
            <div className={styles.summary}>
              <div className={styles.summaryName}>{office.name}</div>
              <div className={styles.summaryHeld}>
                Cash held: {formatCurrency(office.cash_held_gbp, "GBP")}
              </div>
            </div>
          )}

          <div className={styles.row}>
            <div className={styles.field}>
              <Label htmlFor="collection-amount">Amount collected (GBP)</Label>
              <Input
                id="collection-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className={styles.field}>
              <Label htmlFor="collection-date">Date</Label>
              <Input
                id="collection-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <Label htmlFor="collection-driver">Collected by</Label>
            <select
              id="collection-driver"
              className={styles.select}
              value={selectedCompanyId}
              onChange={(e) => {
                const companyId = e.target.value;
                setSelectedCompanyId(companyId);
                const company = companies.find((c) => c.id === companyId);
                setDriver(company?.name ?? "");
              }}
              required
            >
              <option value="">
                {companies.length === 0
                  ? "No companies — add one on the Agents page"
                  : "Select collection company"}
              </option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Logging…" : "Confirm collection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
