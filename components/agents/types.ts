export interface Agent {
  id: string;
  name: string;
  city: string;
  phone: string | null;
  balance_usd: number;
  last_agent_deposit: string | null;
  status: "active" | "inactive";
  collection_company_id: string | null;
  collection_company_name?: string | null;
  created_at: string;
  /** Profit/loss amount based on rate differential × balance. Null when no data. */
  profit_loss?: number | null;
}

export interface AgentDepositRow {
  id: string;
  agent_id: string;
  date: string;
  amount_received_gbp: number;
  amount_usd_equivalent: number;
  rate_used: number;
  receipt_number: string | null;
  recorded_by: string | null;
  recorded_by_name?: string | null;
}

export interface CollectionCompany {
  id: string;
  name: string;
}
