export interface CITCollection {
  id: string;
  date: string;
  company_id: string | null;
  company_name: string;
  hq_sale_rate: number;
  amount_usd: number;
  branch_office_id: string | null;
  branch_name: string;
  brought_to_hq: boolean;
  courier_notes: string | null;
  logged_by: string | null;
  logged_by_name: string | null;
  created_at: string;
  /** Agent collection rate from rate_entries for the same date */
  agent_rate: number | null;
  /** (hq_sale_rate - agent_rate) * amount_usd */
  profit_loss: number | null;
}

export interface BranchOffice {
  id: string;
  name: string;
}
