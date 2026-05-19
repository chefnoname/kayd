export interface Agent {
  id: string;
  name: string;
  city: string;
  phone: string | null;
  balance_usd: number;
  last_settlement: string | null;
  status: "active" | "inactive";
}

export interface SettlementRow {
  id: string;
  agent_id: string;
  date: string;
  amount_received_gbp: number;
  amount_usd_equivalent: number;
  receipt_number: string | null;
  recorded_by: string | null;
  recorded_by_name?: string | null;
}
