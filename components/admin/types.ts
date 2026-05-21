export type UserRole = "superadmin" | "admin" | "staff";
export type UserStatus = "active" | "inactive";

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  invited_by: string | null;
  created_at: string;
  last_active_at: string | null;
}
