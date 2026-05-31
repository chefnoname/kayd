export interface Agent {
  id: string;
  name: string;
  city: string;
  phone: string | null;
  balance_usd: number;
  last_agent_deposit: string | null;
  status: "active" | "inactive";
}

export interface AgentDepositRow {
  id: string;
  agent_id: string;
  date: string;
  amount_received_gbp: number;
  amount_usd_equivalent: number;
  receipt_number: string | null;
  recorded_by: string | null;
  recorded_by_name?: string | null;
}
