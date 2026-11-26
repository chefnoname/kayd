"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ReasonDialog } from "./ReasonDialog";
import { consoleAction } from "./consoleApi";
import styles from "@/app/console/console.module.css";

export function OrgActions({
  organisationId,
  name,
  suspended,
  people,
}: {
  organisationId: string;
  name: string;
  suspended: boolean;
  people: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reactivate() {
    setBusy(true);
    setError(null);
    try {
      const r = await consoleAction("reactivate", { organisationId });
      toast({ title: r.message ?? "Reactivated." });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {suspended ? (
        <Button variant="outline" onClick={reactivate} disabled={busy}>
          Reactivate
        </Button>
      ) : (
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Suspend organisation
        </Button>
      )}
      <ReasonDialog
        open={open}
        onOpenChange={setOpen}
        title={`Suspend ${name}?`}
        description={`All ${people} ${people === 1 ? "person is" : "people are"} signed out and can't sign in until you reactivate the organisation. Their data is kept. The client's admin will see this in their Kayd access list.`}
        placeholder="e.g. Unpaid since 1 Nov, client told on 20 Nov"
        confirmLabel="Suspend organisation"
        destructive
        onConfirm={async (reason) => {
          const r = await consoleAction("suspend", { organisationId, reason });
          toast({ title: r.message ?? "Suspended." });
          router.refresh();
        }}
      />
    </>
  );
}
