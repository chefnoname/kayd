-- 012_collection_receipt_status.sql
-- Adds receipt confirmation tracking to collection_pickups
-- for the follow-up popup feature.

alter table public.collection_pickups
  add column if not exists receipt_status text
    check (receipt_status in ('received', 'not_received')),
  add column if not exists receipt_confirmed_at timestamptz,
  add column if not exists receipt_confirmed_by uuid references auth.users(id) on delete set null;
