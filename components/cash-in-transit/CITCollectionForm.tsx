"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toDateString } from "@/lib/utils";
import type { BranchOffice } from "./types";
import type { CollectionCompany } from "@/components/agents/types";
import styles from "./CITCollectionForm.module.css";

interface CITCollectionFormProps {
  companies: CollectionCompany[];
  branches: BranchOffice[];
  onSubmitted: () => void;
  orgId: string;
  todaySendRate: number | null;
  todayReceiveRate: number | null;
}

export function CITCollectionForm({
  companies,
  branches,
  onSubmitted,
  orgId,
  todaySendRate,
  todayReceiveRate,
}: CITCollectionFormProps) {
  const [companyId, setCompanyId] = useState("");
  const [date, setDate] = useState(toDateString());
  const [hqRate, setHqRate] = useState("");
  const [recRate, setRecRate] = useState(
    todayReceiveRate != null ? todayReceiveRate.toFixed(4) : ""
  );
  const [amount, setAmount] = useState("");
  const [branchId, setBranchId] = useState("");
  const [broughtToHq, setBroughtToHq] = useState(false);
  const [courierNotes, setCourierNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCompany = companies.find((c) => c.id === companyId);
  const selectedBranch = branches.find((b) => b.id === branchId);
  const isSubBranch =
    selectedBranch != null &&
    !selectedBranch.name.toLowerCase().includes("hq") &&
    !selectedBranch.name.toLowerCase().includes("head");

  const hqRateNum = parseFloat(hqRate);
  const recRateNum = parseFloat(recRate);
  const amountNum = parseFloat(amount);
  const valid =
    !!companyId &&
    !!branchId &&
    !!date &&
    !isNaN(hqRateNum) &&
    hqRateNum > 0 &&
    !isNaN(recRateNum) &&
    recRateNum > 0 &&
    !isNaN(amountNum) &&
    amountNum > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || !selectedCompany || !selectedBranch) return;
    setSubmitting(true);
    setError(null);

    try {
      const { createClient } = await import("@/lib/supabase");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: insertErr } = await supabase
        .from("cit_collections")
        .insert({
          organisation_id: orgId,
          date,
          company_id: companyId,
          company_name: selectedCompany.name,
          hq_sale_rate: hqRateNum,
          receive_rate: recRateNum,
          amount_usd: amountNum,
          branch_office_id: branchId,
          branch_name: selectedBranch.name,
          brought_to_hq: isSubBranch ? broughtToHq : true,
          courier_notes: isSubBranch ? courierNotes.trim() || null : null,
          logged_by: user?.id ?? null,
        });

      if (insertErr) throw new Error(insertErr.message);

      // Reset form
      setCompanyId("");
      setHqRate("");
      setRecRate(todayReceiveRate != null ? todayReceiveRate.toFixed(4) : "");
      setAmount("");
      setBranchId("");
      setBroughtToHq(false);
      setCourierNotes("");
      onSubmitted();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log a Collection</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {(todaySendRate != null || todayReceiveRate != null) && (
            <div className={styles.rateBanner}>
              <span className={styles.rateLabel}>Today&apos;s rates:</span>
              {todaySendRate != null && (
                <span className={styles.rateValue}>
                  Send <strong>{todaySendRate.toFixed(4)}</strong>
                </span>
              )}
              {todayReceiveRate != null && (
                <span className={styles.rateValue}>
                  Receive <strong>{todayReceiveRate.toFixed(4)}</strong>
                </span>
              )}
            </div>
          )}
          <div className={styles.row}>
            <div className={styles.field}>
              <Label htmlFor="cit-company">Collection company</Label>
              <select
                id="cit-company"
                className={styles.select}
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
              >
                <option value="">Select company…</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <Label htmlFor="cit-date">Date</Label>
              <Input
                id="cit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <Label htmlFor="cit-rate">HQ sale rate</Label>
              <Input
                id="cit-rate"
                type="number"
                step="0.0001"
                min="0"
                placeholder="e.g. 1.3200"
                value={hqRate}
                onChange={(e) => setHqRate(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <Label htmlFor="cit-rec-rate">Receive rate</Label>
              <Input
                id="cit-rec-rate"
                type="number"
                step="0.0001"
                min="0"
                placeholder="e.g. 1.3000"
                value={recRate}
                onChange={(e) => setRecRate(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <Label htmlFor="cit-amount">Amount (USD)</Label>
              <Input
                id="cit-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 10000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <Label htmlFor="cit-branch">Branch</Label>
            <select
              id="cit-branch"
              className={styles.select}
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                setBroughtToHq(false);
                setCourierNotes("");
              }}
            >
              <option value="">Select branch…</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {isSubBranch && (
            <div className={styles.subBranchFields}>
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={broughtToHq}
                  onChange={(e) => setBroughtToHq(e.target.checked)}
                />
                <span>Brought to London HQ</span>
              </label>
              <div className={styles.field}>
                <Label htmlFor="cit-courier">Courier / Notes</Label>
                <Textarea
                  id="cit-courier"
                  rows={2}
                  placeholder="e.g. Securitas — ref SC-2026-041"
                  value={courierNotes}
                  onChange={(e) => setCourierNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={!valid || submitting}>
            {submitting ? "Saving…" : "Log Collection"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
