-- 016_cit_receive_rate.sql
-- Store the receive rate directly on each CIT collection row so P/L
-- is calculated from the rate at time of logging, not a lookup.

ALTER TABLE public.cit_collections
  ADD COLUMN receive_rate numeric(12, 6);
