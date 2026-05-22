export type UserRole = "superadmin" | "admin" | "staff";
export type UserStatus = "active" | "inactive" | "pending";

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  invited_by: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}
