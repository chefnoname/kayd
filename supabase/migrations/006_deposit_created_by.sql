-- Track which staff member recorded each deposit
alter table public.individual_deposits
  add column if not exists created_by uuid references auth.users (id);
