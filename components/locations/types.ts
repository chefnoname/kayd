export interface RegionalOffice {
  id: string;
  name: string;
  cash_held_gbp: number;
  last_collection_date: string | null;
  created_at: string;
}

export interface CollectionPickup {
  id: string;
  office_id: string;
  amount_gbp: number;
  date: string;
  collected_by_name: string | null;
  created_at: string;
}
