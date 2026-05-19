export type DepositStatus = "held" | "released";

export interface Deposit {
  id: string;
  holder_name: string;
  amount_usd: number;
  date_received: string;
  location: string | null;
  notes: string | null;
  status: DepositStatus;
  released_at: string | null;
  released_to: string | null;
  created_at: string;
}

export type DepositFilter = "all" | "held" | "released";
