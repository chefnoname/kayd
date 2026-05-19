export interface EODBalance {
  id: string;
  date: string;
  opening_gbp: number;
  cash_in_safe_gbp: number;
  collections_today_gbp: number;
  total_agent_debt_gbp: number;
  closing_gbp: number;
  discrepancy: number;
  is_closed: boolean;
  notes: string | null;
  closed_at: string | null;
}
