export type UserRole = "superadmin" | "admin" | "staff";

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  invited_by: string | null;
  created_at: string;
}
