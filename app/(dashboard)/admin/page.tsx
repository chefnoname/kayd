"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { UserManagementTable } from "@/components/admin/UserManagementTable";
import { InviteUserModal } from "@/components/admin/InviteUserModal";
import type { StaffUser, UserRole } from "@/components/admin/types";
import { useToast } from "@/components/ui/toast";
import { SESSION_TIMEOUT_MINUTES } from "@/lib/constants";
import styles from "./admin.module.css";

export default function AdminPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Session timeout settings
  const [timeoutValue, setTimeoutValue] = useState<string>("");
  const [timeoutSaving, setTimeoutSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    const res = await fetch("/api/admin/users");
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to load users.");
      setUsers([]);
      setLoading(false);
      return;
    }

    const body = await res.json();
    setUsers(
      (body.users ?? []).map((r: any) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        role: r.role as UserRole,
        status: (r.status ?? "active") as StaffUser["status"],
        invited_by: r.invited_by,
        created_at: r.created_at,
        last_sign_in_at: r.last_sign_in_at,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Load current session timeout setting
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/org/session-timeout");
        if (!res.ok) return;
        const data = await res.json();
        setTimeoutValue(
          data.session_timeout_minutes != null
            ? String(data.session_timeout_minutes)
            : ""
        );
      } catch {
        /* keep default */
      }
    })();
  }, []);

  async function handleSaveTimeout() {
    setTimeoutSaving(true);
    const minutes = timeoutValue.trim() === "" ? null : Number(timeoutValue);
    if (minutes !== null && (isNaN(minutes) || minutes < 1 || minutes > 1440)) {
      toast({ title: "Invalid value", description: "Enter a number between 1 and 1440, or leave blank for default." });
      setTimeoutSaving(false);
      return;
    }
    const res = await fetch("/api/org/session-timeout", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_timeout_minutes: minutes }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: "Error", description: data.error });
    } else {
      toast({
        title: "Saved",
        description: minutes
          ? `Session timeout set to ${minutes} minutes.`
          : `Session timeout reset to default (${SESSION_TIMEOUT_MINUTES} min).`,
      });
    }
    setTimeoutSaving(false);
  }

  async function handleChangeRole(user: StaffUser, newRole: UserRole) {
    const res = await fetch("/api/admin/change-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, newRole }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: "Error", description: data.error });
      return;
    }
    toast({ title: "Role updated", description: `${user.name} is now ${newRole}` });
    load();
  }

  async function handleDeactivate(user: StaffUser) {
    const res = await fetch("/api/admin/deactivate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: "Error", description: data.error });
      return;
    }
    toast({ title: "User deactivated", description: `${user.email} can no longer log in.` });
    load();
  }

  async function handleResetPassword(user: StaffUser) {
    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: "Error", description: data.error });
      return;
    }
    toast({ title: "Magic link sent", description: `Email sent to ${user.email}` });
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Admin panel"
        description="Manage all users across the platform."
        actions={
          <Button onClick={() => setInviteOpen(true)}>Invite new user</Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <UserManagementTable
          users={users}
          currentUserId={currentUserId}
          canManageAdmins={true}
          onChangeRole={handleChangeRole}
          onDeactivate={handleDeactivate}
          onResetPassword={handleResetPassword}
        />
      )}

      <div className={styles.settingsCard}>
        <h3 className={styles.settingsTitle}>Session Timeout</h3>
        <p className={styles.settingsDesc}>
          Auto-logout after inactivity. Leave blank to use the default ({SESSION_TIMEOUT_MINUTES} min).
        </p>
        <div className={styles.settingsRow}>
          <Input
            type="number"
            min={1}
            max={1440}
            placeholder={String(SESSION_TIMEOUT_MINUTES)}
            value={timeoutValue}
            onChange={(e) => setTimeoutValue(e.target.value)}
            className={styles.timeoutInput}
          />
          <span className={styles.settingsUnit}>minutes</span>
          <Button
            onClick={handleSaveTimeout}
            disabled={timeoutSaving}
            size="sm"
          >
            {timeoutSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <InviteUserModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvited={load}
        allowAdmin={true}
        inviterId={currentUserId}
      />
    </div>
  );
}
