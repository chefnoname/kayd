"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ReasonDialog } from "./ReasonDialog";
import { consoleAction } from "./consoleApi";
import styles from "@/app/console/console.module.css";

/** Access controls for one client person. Kayd staff never see or set passwords. */
export function PersonActions({
  userId,
  name,
  email,
  locked,
}: {
  userId: string;
  name: string;
  email: string;
  locked: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [lockOpen, setLockOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "send_reset" | "sign_out" | "unlock") {
    setBusy(action);
    setError(null);
    try {
      const r = await consoleAction(action, { userId });
      toast({ title: r.message ?? "Done." });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={styles.stack}>
      <div className={styles.actions}>
        <Button variant="outline" onClick={() => run("send_reset")} disabled={busy !== null || locked}>
          {busy === "send_reset" ? "Sending…" : "Send password reset link"}
        </Button>
        <Button variant="outline" onClick={() => run("sign_out")} disabled={busy !== null}>
          {busy === "sign_out" ? "Signing out…" : "Sign out everywhere"}
        </Button>
        {locked ? (
          <Button variant="outline" onClick={() => run("unlock")} disabled={busy !== null}>
            {busy === "unlock" ? "Unlocking…" : "Unlock account"}
          </Button>
        ) : (
          <Button variant="destructive" onClick={() => setLockOpen(true)} disabled={busy !== null}>
            Lock account
          </Button>
        )}
      </div>
      <p className={styles.muted}>
        The reset link goes to {email}. Kayd never sees or sets passwords. Every action here is shown to the
        client&apos;s admin.
      </p>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <ReasonDialog
        open={lockOpen}
        onOpenChange={setLockOpen}
        title={`Lock ${name}?`}
        description={`${name} is signed out of every device and can't sign in until you unlock the account. Use this if a device was lost or the account looks compromised.`}
        placeholder="e.g. Client reported a stolen phone on 25 Nov"
        confirmLabel="Lock account"
        destructive
        onConfirm={async (reason) => {
          const r = await consoleAction("lock", { userId, reason });
          toast({ title: r.message ?? "Locked." });
          router.refresh();
        }}
      />
    </div>
  );
}
