"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StaffUser, UserRole } from "./types";
import styles from "./admin.module.css";

interface UserManagementTableProps {
  users: StaffUser[];
  currentUserId: string;
  canManageAdmins: boolean;
  onChangeRole: (user: StaffUser, newRole: UserRole) => void;
  onDeactivate: (user: StaffUser) => void;
  onResetPassword: (user: StaffUser) => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function roleBadgeClass(role: UserRole): string {
  if (role === "superadmin") return styles.badgeSuperadmin;
  if (role === "admin") return styles.badgeAdmin;
  return styles.badgeStaff;
}

export function UserManagementTable({
  users,
  currentUserId,
  canManageAdmins,
  onChangeRole,
  onDeactivate,
  onResetPassword,
}: UserManagementTableProps) {
  return (
    <div className={styles.tableCard}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className={styles.empty}>
                No users found
              </TableCell>
            </TableRow>
          ) : (
            users.map((u) => {
              const isSelf = u.id === currentUserId;
              const isInactive = u.status === "inactive";
              const nextRole: UserRole =
                u.role === "staff" ? "admin" : "staff";
              const canToggle =
                !isSelf &&
                !isInactive &&
                u.role !== "superadmin" &&
                (canManageAdmins || u.role !== "admin");

              return (
                <TableRow key={u.id}>
                  <TableCell>
                    {u.name}
                    {isInactive && (
                      <Badge
                        className={`${styles.roleBadge} ${styles.badgeStaff}`}
                        style={{ marginLeft: 8 }}
                      >
                        inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className={styles.email}>{u.email}</TableCell>
                  <TableCell>
                    <Badge
                      className={`${styles.roleBadge} ${roleBadgeClass(
                        u.role
                      )}`}
                    >
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(u.last_active_at)}</TableCell>
                  <TableCell>
                    <div className={styles.actions}>
                      {canToggle && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onChangeRole(u, nextRole)}
                        >
                          Make {nextRole}
                        </Button>
                      )}
                      {!isSelf && !isInactive && u.role !== "superadmin" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onResetPassword(u)}
                        >
                          Reset PW
                        </Button>
                      )}
                      {!isSelf && !isInactive && u.role !== "superadmin" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onDeactivate(u)}
                        >
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
