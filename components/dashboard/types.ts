export interface DailyBalance {
  id: string;
  date: string;
  opening_gbp: number;
  system_limit_usd: number;
  cash_in_safe_gbp: number;
  total_agent_debt_gbp: number;
  collections_today_gbp: number;
  closing_gbp: number;
  is_closed: boolean;
  discrepancy: number;
}
