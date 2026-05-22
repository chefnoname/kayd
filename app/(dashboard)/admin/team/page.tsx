"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserManagementTable } from "@/components/admin/UserManagementTable";
import { InviteUserModal } from "@/components/admin/InviteUserModal";
import type { StaffUser, UserRole } from "@/components/admin/types";
import { useToast } from "@/components/ui/toast";
import styles from "./team.module.css";

export default function TeamPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

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
        title="My team"
        description="Manage staff members you've invited."
        actions={
          <Button onClick={() => setInviteOpen(true)}>Invite staff</Button>
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
          canManageAdmins={false}
          onChangeRole={handleChangeRole}
          onDeactivate={handleDeactivate}
          onResetPassword={handleResetPassword}
        />
      )}

      <InviteUserModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvited={(email) => {
          toast({ title: `Invite sent to ${email}` });
          load();
        }}
        allowAdmin={false}
        inviterId={currentUserId}
      />
    </div>
  );
}
