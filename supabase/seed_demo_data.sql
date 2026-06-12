-- ============================================================
-- Kayd Demo Seed Data
-- For the organisation belonging to abdicodes94@gmail.com
-- Run this in the Supabase SQL Editor (as service_role).
-- ============================================================

DO $$
DECLARE
  v_org_id     uuid;
  v_user_id    uuid;
  v_today      date := current_date;
  v_yesterday  date := current_date - 1;
  -- Collection companies
  v_cc_dahabshiil uuid;
  v_cc_amal       uuid;
  v_cc_iftin      uuid;
  -- Regional offices
  v_office_london  uuid;
  v_office_bristol uuid;
  v_office_birmingham uuid;
  -- Agents
  v_agent_abdullahi uuid;
  v_agent_fartun    uuid;
  v_agent_yusuf     uuid;
  v_agent_amina     uuid;
  v_agent_omar      uuid;
  v_agent_khadra    uuid;
  v_agent_hassan    uuid;
BEGIN
  -- --------------------------------------------------------
  -- Resolve user + org
  -- --------------------------------------------------------
  SELECT su.id, su.organisation_id
    INTO v_user_id, v_org_id
    FROM public.staff_users su
   WHERE su.email = 'abdicodes94@gmail.com'
   LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organisation found for abdicodes94@gmail.com';
  END IF;

  -- Update org name for demo
  UPDATE public.organisations
     SET name = 'Kayd Remittance Ltd'
   WHERE id = v_org_id;

  -- Update bank details
  UPDATE public.organisations
     SET bank_name       = 'Barclays Business',
         sort_code       = '20-45-67',
         account_number  = '73829104'
   WHERE id = v_org_id;

  -- Update staff user name
  UPDATE public.staff_users
     SET name = 'Abu Hanifa'
   WHERE id = v_user_id;

  -- --------------------------------------------------------
  -- Clean existing demo data (idempotent re-runs)
  -- --------------------------------------------------------
  DELETE FROM public.agent_deposits  WHERE organisation_id = v_org_id;
  DELETE FROM public.collection_pickups WHERE organisation_id = v_org_id;
  DELETE FROM public.individual_deposits WHERE organisation_id = v_org_id;
  DELETE FROM public.agents WHERE organisation_id = v_org_id;
  DELETE FROM public.collection_companies WHERE organisation_id = v_org_id;
  DELETE FROM public.regional_offices WHERE organisation_id = v_org_id;
  DELETE FROM public.daily_balances WHERE organisation_id = v_org_id;
  DELETE FROM public.daily_rates WHERE organisation_id = v_org_id;

  -- --------------------------------------------------------
  -- 1. Collection Companies
  -- --------------------------------------------------------
  INSERT INTO public.collection_companies (id, organisation_id, name)
  VALUES
    (gen_random_uuid(), v_org_id, 'Dahabshiil Express'),
    (gen_random_uuid(), v_org_id, 'Amal Courier'),
    (gen_random_uuid(), v_org_id, 'Iftin Logistics');

  SELECT id INTO v_cc_dahabshiil FROM public.collection_companies WHERE organisation_id = v_org_id AND name = 'Dahabshiil Express';
  SELECT id INTO v_cc_amal       FROM public.collection_companies WHERE organisation_id = v_org_id AND name = 'Amal Courier';
  SELECT id INTO v_cc_iftin      FROM public.collection_companies WHERE organisation_id = v_org_id AND name = 'Iftin Logistics';

  -- --------------------------------------------------------
  -- 2. Daily Rates (last 7 days + today)
  -- --------------------------------------------------------
  INSERT INTO public.daily_rates (organisation_id, date, gbp_to_usd, set_by)
  VALUES
    (v_org_id, v_today - 7, 1.2710, v_user_id),
    (v_org_id, v_today - 6, 1.2685, v_user_id),
    (v_org_id, v_today - 5, 1.2730, v_user_id),
    (v_org_id, v_today - 4, 1.2695, v_user_id),
    (v_org_id, v_today - 3, 1.2720, v_user_id),
    (v_org_id, v_today - 2, 1.2740, v_user_id),
    (v_org_id, v_today - 1, 1.2715, v_user_id),
    (v_org_id, v_today,     1.2700, v_user_id);

  -- --------------------------------------------------------
  -- 3. Regional Offices
  -- --------------------------------------------------------
  INSERT INTO public.regional_offices (id, organisation_id, name, cash_held_gbp, last_collection_date)
  VALUES
    (gen_random_uuid(), v_org_id, 'London HQ',   4250.00, v_today - 1),
    (gen_random_uuid(), v_org_id, 'Bristol',      2800.00, v_today - 2),
    (gen_random_uuid(), v_org_id, 'Birmingham',   6100.00, v_today - 3);

  SELECT id INTO v_office_london     FROM public.regional_offices WHERE organisation_id = v_org_id AND name = 'London HQ';
  SELECT id INTO v_office_bristol    FROM public.regional_offices WHERE organisation_id = v_org_id AND name = 'Bristol';
  SELECT id INTO v_office_birmingham FROM public.regional_offices WHERE organisation_id = v_org_id AND name = 'Birmingham';

  -- --------------------------------------------------------
  -- 4. Agents — varied balances, some above $10k threshold
  -- --------------------------------------------------------
  INSERT INTO public.agents (id, organisation_id, name, city, phone, balance_usd, last_agent_deposit, status, collection_company_id, created_at)
  VALUES
    (gen_random_uuid(), v_org_id, 'Abdullahi Warsame',  'Mogadishu',   '+252 61 234 5678', 12500.00, v_today,     'active',   v_cc_dahabshiil, now() - interval '45 days'),
    (gen_random_uuid(), v_org_id, 'Fartun Abdi',        'Hargeisa',    '+252 63 876 5432', 15200.00, v_today - 1, 'active',   v_cc_amal,       now() - interval '30 days'),
    (gen_random_uuid(), v_org_id, 'Yusuf Mohamed',      'Nairobi',     '+254 72 345 6789', 3400.00,  v_today,     'active',   v_cc_dahabshiil, now() - interval '60 days'),
    (gen_random_uuid(), v_org_id, 'Amina Hassan',       'Djibouti',    '+253 77 456 7890', 8750.00,  v_today - 2, 'active',   v_cc_iftin,      now() - interval '25 days'),
    (gen_random_uuid(), v_org_id, 'Omar Farah',         'Bosaso',      '+252 69 567 8901', 0.00,     v_today,     'active',   v_cc_amal,       now() - interval '90 days'),
    (gen_random_uuid(), v_org_id, 'Khadra Yusuf',       'Garowe',      '+252 68 678 9012', 6200.00,  v_today - 3, 'active',   v_cc_iftin,      now() - interval '15 days'),
    (gen_random_uuid(), v_org_id, 'Hassan Ali',         'Mogadishu',   '+252 61 789 0123', 1500.00,  NULL,        'inactive', NULL,            now() - interval '120 days');

  SELECT id INTO v_agent_abdullahi FROM public.agents WHERE organisation_id = v_org_id AND name = 'Abdullahi Warsame';
  SELECT id INTO v_agent_fartun    FROM public.agents WHERE organisation_id = v_org_id AND name = 'Fartun Abdi';
  SELECT id INTO v_agent_yusuf     FROM public.agents WHERE organisation_id = v_org_id AND name = 'Yusuf Mohamed';
  SELECT id INTO v_agent_amina     FROM public.agents WHERE organisation_id = v_org_id AND name = 'Amina Hassan';
  SELECT id INTO v_agent_omar      FROM public.agents WHERE organisation_id = v_org_id AND name = 'Omar Farah';
  SELECT id INTO v_agent_khadra    FROM public.agents WHERE organisation_id = v_org_id AND name = 'Khadra Yusuf';
  SELECT id INTO v_agent_hassan    FROM public.agents WHERE organisation_id = v_org_id AND name = 'Hassan Ali';

  -- --------------------------------------------------------
  -- 5. Agent Deposits (today + recent days)
  -- --------------------------------------------------------
  -- Today's deposits (will show in Activity Feed)
  INSERT INTO public.agent_deposits (organisation_id, agent_id, date, amount_received_gbp, rate_used, amount_usd_equivalent, new_agent_balance_usd, receipt_number, recorded_by, created_at)
  VALUES
    (v_org_id, v_agent_abdullahi, v_today, 2000.00, 1.2700, 2540.00, 12500.00, 'REC-2024-0041', v_user_id, now() - interval '3 hours'),
    (v_org_id, v_agent_yusuf,     v_today, 1500.00, 1.2700, 1905.00, 3400.00,  'REC-2024-0042', v_user_id, now() - interval '2 hours'),
    (v_org_id, v_agent_omar,      v_today, 3200.00, 1.2700, 4064.00, 0.00,     'REC-2024-0043', v_user_id, now() - interval '1 hour'),
    -- Yesterday
    (v_org_id, v_agent_fartun,    v_yesterday, 1800.00, 1.2715, 2288.70, 15200.00, 'REC-2024-0038', v_user_id, now() - interval '1 day 4 hours'),
    (v_org_id, v_agent_abdullahi, v_yesterday, 2500.00, 1.2715, 3178.75, 15040.00, 'REC-2024-0039', v_user_id, now() - interval '1 day 2 hours'),
    (v_org_id, v_agent_khadra,    v_yesterday, 1000.00, 1.2715, 1271.50, 6200.00,  'REC-2024-0040', v_user_id, now() - interval '1 day 1 hour'),
    -- 2 days ago
    (v_org_id, v_agent_amina,     v_today - 2, 900.00,  1.2740, 1146.60, 8750.00,  'REC-2024-0035', v_user_id, now() - interval '2 days 5 hours'),
    (v_org_id, v_agent_yusuf,     v_today - 2, 2200.00, 1.2740, 2802.80, 5305.00,  'REC-2024-0036', v_user_id, now() - interval '2 days 3 hours');

  -- --------------------------------------------------------
  -- 6. Collection Pickups
  --    Mix: some confirmed, some pending (no receipt_status) to
  --    trigger the Follow-Up Popup
  -- --------------------------------------------------------
  -- Confirmed pickups (older)
  INSERT INTO public.collection_pickups (organisation_id, office_id, amount_gbp, date, collected_by_name, collection_company_id, receipt_status, receipt_confirmed_at, receipt_confirmed_by, created_at)
  VALUES
    (v_org_id, v_office_london,  3500.00, v_today - 5, 'Dahabshiil Express', v_cc_dahabshiil, 'received', now() - interval '4 days', v_user_id, now() - interval '5 days'),
    (v_org_id, v_office_bristol, 2000.00, v_today - 4, 'Amal Courier',      v_cc_amal,       'received', now() - interval '3 days', v_user_id, now() - interval '4 days'),
    (v_org_id, v_office_birmingham, 4200.00, v_today - 3, 'Iftin Logistics', v_cc_iftin,     'received', now() - interval '2 days', v_user_id, now() - interval '3 days');

  -- Recent confirmed (today)
  INSERT INTO public.collection_pickups (organisation_id, office_id, amount_gbp, date, collected_by_name, collection_company_id, receipt_status, receipt_confirmed_at, receipt_confirmed_by, created_at)
  VALUES
    (v_org_id, v_office_london, 1800.00, v_today, 'Dahabshiil Express', v_cc_dahabshiil, 'received', now() - interval '30 minutes', v_user_id, now() - interval '4 hours');

  -- PENDING pickups (no receipt_status) — these trigger the follow-up popup
  INSERT INTO public.collection_pickups (organisation_id, office_id, amount_gbp, date, collected_by_name, collection_company_id, receipt_status, receipt_confirmed_at, receipt_confirmed_by, created_at)
  VALUES
    (v_org_id, v_office_bristol,    2500.00, v_today - 1, 'Amal Courier',    v_cc_amal,  NULL, NULL, NULL, now() - interval '26 hours'),
    (v_org_id, v_office_birmingham, 3100.00, v_today - 1, 'Iftin Logistics', v_cc_iftin, NULL, NULL, NULL, now() - interval '28 hours');

  -- --------------------------------------------------------
  -- 7. Individual Deposits (customer money held)
  -- --------------------------------------------------------
  INSERT INTO public.individual_deposits (organisation_id, holder_name, amount_usd, date_received, location, status, notes)
  VALUES
    (v_org_id, 'Abdirahman Nur',  500.00,  v_today,     'London HQ', 'held',     'Waiting for agent confirmation'),
    (v_org_id, 'Sahra Osman',     1200.00, v_today - 1, 'Bristol',   'held',     'Customer returning tomorrow'),
    (v_org_id, 'Mohamed Aden',    800.00,  v_today - 2, 'London HQ', 'released', 'Released to Abdullahi'),
    (v_org_id, 'Halimo Farah',    350.00,  v_today - 3, 'Birmingham','released', NULL),
    (v_org_id, 'Abdi Yusuf',      2000.00, v_today,     'London HQ', 'held',     'Large deposit — needs manager sign-off');

  -- --------------------------------------------------------
  -- 8. Daily Balances
  -- --------------------------------------------------------
  -- Yesterday (closed)
  INSERT INTO public.daily_balances (organisation_id, date, opening_gbp, system_limit_usd, cash_in_safe_gbp, total_agent_debt_gbp, collections_today_gbp, closing_gbp, is_closed, discrepancy, closed_at)
  VALUES
    (v_org_id, v_yesterday, 18500.00, 50000.00, 12400.00, 36220.00, 5300.00, 15800.00, true, 0.00, now() - interval '14 hours');

  -- Today (open, in progress)
  INSERT INTO public.daily_balances (organisation_id, date, opening_gbp, system_limit_usd, cash_in_safe_gbp, total_agent_debt_gbp, collections_today_gbp, closing_gbp, is_closed, discrepancy)
  VALUES
    (v_org_id, v_today, 15800.00, 50000.00, 9100.00, 37047.24, 1800.00, 15800.00, false, 0.00)
  ON CONFLICT (organisation_id, date) DO UPDATE SET
    opening_gbp         = EXCLUDED.opening_gbp,
    system_limit_usd    = EXCLUDED.system_limit_usd,
    cash_in_safe_gbp    = EXCLUDED.cash_in_safe_gbp,
    total_agent_debt_gbp = EXCLUDED.total_agent_debt_gbp,
    collections_today_gbp = EXCLUDED.collections_today_gbp,
    closing_gbp         = EXCLUDED.closing_gbp,
    is_closed           = EXCLUDED.is_closed,
    discrepancy         = EXCLUDED.discrepancy;

  RAISE NOTICE '✅ Demo data seeded for org %', v_org_id;
END$$;
