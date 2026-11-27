-- DarboRitmas · 0023 · Darbuotojų (vietų) ribojimas pagal planą
-- Paleisti po 0022_plans.sql.
--
-- Vieta = vienas aktyvus narys arba laukiantis pakvietimas (įskaitant administratorius ir direktorių).
-- Vietų limitas:  apmokėta prenumerata (aktyvi / vėluojanti / bandomoji) = subscriptions.seats;  nemokamas bandymas = 10;
-- nemokama prieiga (complimentary) = 1000;  prieigos nėra = taisyklė netaikoma (kurti neleidžia RLS).
-- Pasiekus limitą naujo nario pakviesti ar pašalinto atkurti negalima. Esami nariai niekada nepašalinami automatiškai
-- (pvz. sumažinus vietas Paddle portale): tik naujų pridėti nebegalima, kol vietų nepakanka.

create function public._company_seat_limit(cid uuid) returns integer
language sql stable security definer set search_path = public as $$
  select case
           when c.complimentary then 1000
           when s.status in ('trialing', 'active', 'past_due') then greatest(coalesce(s.seats, 1), 1)
           when c.trial_ends_at > now() then 10
           else 0
         end
    from public.companies c
    left join public.subscriptions s on s.company_id = c.id
   where c.id = cid
$$;
revoke execute on function public._company_seat_limit(uuid) from public, anon, authenticated;
grant  execute on function public._company_seat_limit(uuid) to service_role;

create function public.company_members_seat_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_limit integer; v_used integer;
begin
  if new.status = 'removed' then return new; end if;                                -- vietos neužima
  if tg_op = 'UPDATE' and old.status <> 'removed' then return new; end if;          -- invited -> active vietų skaičiaus nekeičia
  if public._company_plan(new.company_id) is null then return new; end if;          -- prieigos nėra: sprendžia RLS

  perform pg_advisory_xact_lock(hashtextextended('seat:' || new.company_id::text, 0));
  v_limit := public._company_seat_limit(new.company_id);
  select count(*) into v_used from public.company_members m
   where m.company_id = new.company_id and m.status in ('invited', 'active') and m.id is distinct from new.id;

  if v_used >= v_limit then
    raise exception 'Visos apmokėtos vietos užimtos (% iš %). Padidinkite darbuotojų skaičių skiltyje Valdymas → Abonementas arba pašalinkite nenaudojamą narį.', v_used, v_limit
      using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger company_members_seat_limit before insert or update of status on public.company_members
  for each row execute function public.company_members_seat_limit();

-- Naudojimo suvestinė (kaip 0022) + vietos.
create or replace function public.plan_usage(cid uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_plan text; v_period date := public.usage_period();
begin
  if not public.is_company_admin(cid) then return null; end if;
  v_plan := public._company_plan(cid);
  return jsonb_build_object(
    'plan', v_plan,
    'documents', jsonb_build_object(
      'used',  (select count(*) from public.usage_events where company_id = cid and kind = 'document' and period = v_period),
      'limit', (select value from public.plan_limits where plan = v_plan and key = 'documents'),
      'hard',  (select hard  from public.plan_limits where plan = v_plan and key = 'documents')),
    'telegram', jsonb_build_object(
      'used',  (select count(*) from public.usage_events where company_id = cid and kind = 'telegram' and period = v_period),
      'limit', (select value from public.plan_limits where plan = v_plan and key = 'telegram'),
      'hard',  (select hard  from public.plan_limits where plan = v_plan and key = 'telegram')),
    'cars', jsonb_build_object(
      'used',  (select count(*) from public.cars where company_id = cid and active),
      'limit', (select value from public.plan_limits where plan = v_plan and key = 'cars'),
      'hard',  true),
    'seats', jsonb_build_object(
      'used',  (select count(*) from public.company_members where company_id = cid and status in ('invited', 'active')),
      'limit', public._company_seat_limit(cid),
      'hard',  true));
end $$;
