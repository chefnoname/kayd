-- Track which staff member recorded each collection pickup
alter table public.collection_pickups
  add column if not exists created_by uuid references auth.users (id);
