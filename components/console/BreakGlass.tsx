"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ReasonDialog } from "./ReasonDialog";
import { consoleAction } from "./consoleApi";

/** Asks for a reason, logs it, then shows amounts for one organisation for 15 minutes. */
export function BreakGlass({ organisationId, orgName }: { organisationId: string; orgName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Show amounts
      </Button>
      <ReasonDialog
        open={open}
        onOpenChange={setOpen}
        title={`Show amounts for ${orgName}?`}
        description="Amounts stay visible to you for 15 minutes. Your name, the time and your reason are logged, and the client's admin sees them in their Kayd access list."
        placeholder="e.g. Client asked us to check a disputed deposit from 24 Nov"
        confirmLabel="Show amounts"
        minLength={10}
        onConfirm={async (reason) => {
          await consoleAction("show_amounts", { organisationId, reason });
          router.refresh();
        }}
      />
    </>
  );
}
