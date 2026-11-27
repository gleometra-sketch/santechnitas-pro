-- DarboRitmas · planų ir limitų (0022_plans.sql) testai
-- Paleidžiama po migracijų (žr. run.sh). Kiekvienas testas arba išspausdina PASS, arba nutraukia vykdymą su FAIL.
-- PASTABA: parašyta nepaleidus PostgreSQL; jei kuris nors testas nepraeina, pirmiausia patikrinkite pačią testo prielaidą.
\set ON_ERROR_STOP on
reset role;
create schema tp;
grant usage on schema tp to authenticated, service_role, anon;
create table tp.ids (name text primary key, id uuid not null);
grant select, insert on tp.ids to authenticated, service_role, anon;
create function tp.id(n text) returns uuid language sql stable as $$ select id from tp.ids where name = n $$;
create function tp.as_user(n text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', (select id::text from tp.ids where name = n), false);
  set role authenticated;
end $$;
create function tp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', msg; end if;
  raise notice 'PASS: %', msg;
end $$;
create function tp.n(q text) returns bigint language plpgsql as $$
declare r bigint; begin execute q into r; return r; end $$;
create function tp.txt(q text) returns text language plpgsql as $$
declare r text; begin execute q into r; return r; end $$;
create function tp.err(q text, expected text, msg_part text default null) returns void language plpgsql as $$
begin
  begin
    execute q;
  exception when others then
    if sqlstate = expected and (msg_part is null or sqlerrm like '%' || msg_part || '%') then
      raise notice 'PASS: klaida % -> %', expected, left(q, 70); return;
    end if;
    raise exception 'FAIL: % davė % (%), laukta % %', left(q, 70), sqlstate, sqlerrm, expected, coalesce(msg_part, '');
  end;
  raise exception 'FAIL: % nesustojo, laukta klaida %', left(q, 70), expected;
end $$;
-- pagalbinė: sąmata su viena eilute (užpildyta antraštė kaip programoje)
create function tp.est(title text, line_name text default 'Vamzdis') returns uuid language plpgsql as $$
declare v uuid;
begin
  insert into public.estimates (company_id, title) values (tp.id('CX'), title) returning id into v;
  perform public.save_estimate(v,
    jsonb_build_object('title', title, 'projectId', '', 'clientName', '', 'clientPhone', '', 'clientEmail', '', 'address', '',
                       'status', 'draft', 'vatPercent', 21, 'discountPercent', 0, 'validUntil', '', 'notes', ''),
    jsonb_build_array(jsonb_build_object('pos', 0, 'kind', 'material', 'name', line_name, 'unit', 'vnt.', 'quantity', 1, 'price', 100)));
  return v;
end $$;
grant execute on function tp.ok(boolean, text), tp.n(text), tp.txt(text), tp.err(text, text, text), tp.est(text, text) to authenticated, service_role, anon;

insert into auth.users (id, email, email_confirmed_at) values
  ('e0000000-0000-0000-0000-0000000000a1', 'pl-a1@x.lt', now()),
  ('e0000000-0000-0000-0000-0000000000a3', 'pl-w@x.lt', now());
insert into tp.ids values ('A1', 'e0000000-0000-0000-0000-0000000000a1'), ('W', 'e0000000-0000-0000-0000-0000000000a3');
select tp.as_user('A1');
insert into tp.ids select 'CX', public.create_company('Planų firma');
reset role;
insert into public.company_members (company_id, user_id, email, role, status) values (tp.id('CX'), tp.id('W'), 'pl-w@x.lt', 'worker', 'active');

-- ================================================================ planas
select tp.as_user('A1');
select tp.ok(public.company_plan(tp.id('CX')) = 'pro', 'bandymo laikotarpis = Pro');
select tp.as_user('W');
select tp.ok(public.company_plan(tp.id('CX')) = 'pro', 'darbuotojas mato įmonės planą');
select tp.ok(public.plan_usage(tp.id('CX')) is null, 'plan_usage darbuotojui nieko neparodo');
reset role;
select tp.ok((select value from public.plan_limits where plan = 'pro' and key = 'documents') = 40, 'Pro: 40 dokumentų');

-- ================================================================ Bazinis: 10 dokumentų, kopija ir trynimas negrąžina
insert into public.subscriptions (company_id, provider_customer_id, status, plan_interval, seats, plan_id) values (tp.id('CX'), 'ctm_t', 'active', 'month', 3, 'bazinis');
select tp.as_user('A1');
select tp.ok(public.company_plan(tp.id('CX')) = 'bazinis', 'aktyvi prenumerata = jos planas');
select tp.est('S' || g) from generate_series(1, 8) g;
select tp.ok((select (public.plan_usage(tp.id('CX')) -> 'documents' ->> 'used')::int) = 8, 'panaudota 8 iš 10');
reset role;
select tp.ok((select count(*) from public.notification_outbox where event_type = 'plan_usage') = 1, 'pasiekus 80 % administratorius gauna įspėjimą (vieną kartą)');
select tp.as_user('A1');
-- redagavimas nenaudoja naujo vieneto
select public.save_estimate((select id from public.estimates where title = 'S1'),
  jsonb_build_object('title', 'S1 pataisyta', 'projectId', '', 'clientName', '', 'clientPhone', '', 'clientEmail', '', 'address', '',
                     'status', 'draft', 'vatPercent', 21, 'discountPercent', 0, 'validUntil', '', 'notes', ''),
  jsonb_build_array(jsonb_build_object('pos', 0, 'kind', 'material', 'name', 'Kitas', 'unit', 'vnt.', 'quantity', 2, 'price', 50)));
select tp.ok((public.plan_usage(tp.id('CX')) -> 'documents' ->> 'used')::int = 8, 'redagavimas vieneto nesunaudoja');
-- kopija = naujas dokumentas
select public.duplicate_estimate((select id from public.estimates where title = 'S2'));
select tp.ok((public.plan_usage(tp.id('CX')) -> 'documents' ->> 'used')::int = 9, 'kopija sunaudoja vienetą');
-- ištrynimas negrąžina
select tp.ok(tp.n($$with d as (delete from public.estimates where title = 'S3' returning 1) select count(*) from d$$) = 1, 'sąmata ištrinta');
select tp.ok((public.plan_usage(tp.id('CX')) -> 'documents' ->> 'used')::int = 9, 'ištrynimas vieneto negrąžina');
-- dešimtas leidžiamas, vienuoliktas ne
select tp.est('S10');
select tp.err($$select tp.est('S11')$$, 'P0001', 'limitas');
select tp.err($$select public.duplicate_estimate((select id from public.estimates where title = 'S2'))$$, 'P0001', 'limitas');
select tp.ok((public.plan_usage(tp.id('CX')) -> 'documents' ->> 'used')::int = 10, 'limitas nesunaudojamas viršijant');
-- esamo dokumento redagavimas limitui pasiekus vis tiek veikia
select public.save_estimate((select id from public.estimates where title = 'S10'),
  jsonb_build_object('title', 'S10', 'projectId', '', 'clientName', 'Jonas', 'clientPhone', '', 'clientEmail', '', 'address', '',
                     'status', 'draft', 'vatPercent', 21, 'discountPercent', 0, 'validUntil', '', 'notes', ''),
  jsonb_build_array(jsonb_build_object('pos', 0, 'kind', 'material', 'name', 'Vamzdis', 'unit', 'vnt.', 'quantity', 3, 'price', 100)));
select tp.ok((select client_name from public.estimates where title = 'S10') = 'Jonas', 'limitui pasiekus esamą sąmatą galima taisyti');
reset role;
select tp.ok((select count(*) from public.notification_outbox where event_type = 'plan_usage') = 2, '100 % įspėjimas išsiųstas (iš viso 2)');

-- ================================================================ sąmatos užrakinimas
select tp.as_user('A1');
update public.estimates set status = 'sent' where title = 'S10';
select tp.err($$update public.estimates set title = 'Keičiu' where title = 'S10'$$, 'P0001', 'keisti negalima');
select tp.err($$update public.estimates set status = 'draft' where title = 'S10'$$, 'P0001', 'juodraštį');
select tp.err($$delete from public.estimate_lines where estimate_id = (select id from public.estimates where title = 'S10')$$, 'P0001', 'keisti negalima');
select public.save_estimate((select id from public.estimates where title = 'S10'),
  jsonb_build_object('title', 'ignoruojama', 'status', 'accepted'), '[]'::jsonb);
select tp.ok((select status from public.estimates where title = 'S10') = 'accepted', 'užrakinta sąmata keičia tik būseną (patvirtinta)');
select tp.ok((select title from public.estimates where title = 'S10') = 'S10', 'turinys nepasikeitė');
select tp.ok(tp.n($$select count(*) from public.estimate_lines where estimate_id = (select id from public.estimates where title = 'S10')$$) = 1, 'eilutės nepasikeitė');
select tp.err($$select public.save_estimate((select id from public.estimates where title = 'S10'), jsonb_build_object('status', 'draft'), '[]'::jsonb)$$, 'P0001', 'juodraštį');
-- išsiųstą sąmatą galima ištrinti (kaskada neblokuojama)
select tp.ok(tp.n($$with d as (delete from public.estimates where title = 'S10' returning 1) select count(*) from d$$) = 1, 'užrakintą sąmatą galima ištrinti');

-- ================================================================ automobiliai
select tp.err($$insert into public.cars (company_id, name, plate) values (tp.id('CX'), 'Vanas', 'AAA111')$$, 'P0001', 'Pro ir Verslui');
reset role;
update public.subscriptions set plan_id = 'pro' where company_id = tp.id('CX');
select tp.as_user('A1');
insert into public.cars (company_id, name, plate) values (tp.id('CX'), 'Vanas 1', 'AAA111');
insert into public.cars (company_id, name, plate) values (tp.id('CX'), 'Vanas 2', 'AAA112');
select tp.err($$insert into public.cars (company_id, name, plate) values (tp.id('CX'), 'Vanas 3', 'AAA113')$$, 'P0001', 'iki 2');
update public.cars set active = false where plate = 'AAA112';
insert into public.cars (company_id, name, plate) values (tp.id('CX'), 'Vanas 3', 'AAA113');
select tp.err($$update public.cars set active = true where plate = 'AAA112'$$, 'P0001', 'iki 2');
reset role;
update public.subscriptions set plan_id = 'verslui' where company_id = tp.id('CX');
select tp.as_user('A1');
select tp.ok(tp.n($$with u as (update public.cars set active = true where plate = 'AAA112' returning 1) select count(*) from u$$) = 1, 'Verslui: leidžiama daugiau automobilių');

-- ================================================================ Telegram kvota (service_role)
reset role;
update public.subscriptions set plan_id = 'pro' where company_id = tp.id('CX');
select tp.ok((public.take_telegram_quota(tp.id('CX'), 'pastabos', 'high') ->> 'allowed')::boolean, 'Pro: Telegram žinutė leidžiama');
insert into public.usage_events (company_id, kind, category) select tp.id('CX'), 'telegram', 'pastabos' from generate_series(1, 238);  -- iš viso 239
select tp.ok((public.take_telegram_quota(tp.id('CX'), 'darbas', 'low') ->> 'allowed')::boolean, '239 iš 300: darbo žinutė dar leidžiama');
select tp.ok(not (public.take_telegram_quota(tp.id('CX'), 'darbas', 'low') ->> 'allowed')::boolean, '≥ 80 %: darbo pradžios / pabaigos žinutės sustabdytos');
select tp.ok((public.take_telegram_quota(tp.id('CX'), 'pastabos', 'high') ->> 'allowed')::boolean, '≥ 80 %: svarbios žinutės dar siunčiamos');
insert into public.usage_events (company_id, kind, category) select tp.id('CX'), 'telegram', 'pastabos' from generate_series(1, 100);
select tp.ok(not (public.take_telegram_quota(tp.id('CX'), 'pastabos', 'high') ->> 'allowed')::boolean, '≥ 100 %: Telegram sustabdytas');
select tp.ok((select count(*) from public.notification_outbox where event_type = 'plan_usage' and title like 'Telegram%') >= 1, 'administratorius gavo Telegram limito įspėjimą programoje');
update public.subscriptions set plan_id = 'bazinis' where company_id = tp.id('CX');
select tp.ok(not (public.take_telegram_quota(tp.id('CX'), 'pastabos', 'high') ->> 'allowed')::boolean, 'Bazinis: Telegram neįeina');
update public.subscriptions set plan_id = 'verslui' where company_id = tp.id('CX');
select tp.ok((public.take_telegram_quota(tp.id('CX'), 'darbas', 'low') ->> 'allowed')::boolean, 'Verslui: sąžiningo naudojimo riba nestabdo');

-- ================================================================ pastaba biurui → pranešimas programoje
select tp.as_user('W');
insert into public.notes (company_id, author_id, kind, body) values (tp.id('CX'), tp.id('W'), 'text', 'Reikia vamzdžių');
reset role;
select tp.ok((select count(*) from public.notification_outbox where event_type = 'office_note' and user_id = tp.id('A1')) = 1, 'pastaba biurui sukuria pranešimą administratoriui');

-- ================================================================ darbuotojų vietos (0023_seats.sql)
reset role;
update public.subscriptions set seats = 3, status = 'active' where company_id = tp.id('CX');
select tp.as_user('A1');
select tp.ok((public.plan_usage(tp.id('CX')) -> 'seats' ->> 'used')::int = 2, 'užimtos vietos: 2 aktyvūs nariai');
select tp.ok((public.plan_usage(tp.id('CX')) -> 'seats' ->> 'limit')::int = 3, 'vietų limitas = apmokėtos vietos');
insert into public.company_members (company_id, email, role, status, invited_by) values (tp.id('CX'), 'n1@x.lt', 'worker', 'invited', tp.id('A1'));
select tp.err($$insert into public.company_members (company_id, email, role, status, invited_by) values (tp.id('CX'), 'n2@x.lt', 'worker', 'invited', tp.id('A1'))$$, 'P0001', 'vietos');
-- laukiantis pakvietimas užima vietą, jo atšaukimas ją atlaisvina
delete from public.company_members where email = 'n1@x.lt';
insert into public.company_members (company_id, email, role, status, invited_by) values (tp.id('CX'), 'n2@x.lt', 'worker', 'invited', tp.id('A1'));
-- pašalinto nario vieta atlaisvinama, bet atkurti jį galima tik jei yra vietų
update public.company_members set status = 'removed' where user_id = tp.id('W');
insert into public.company_members (company_id, email, role, status, invited_by) values (tp.id('CX'), 'n3@x.lt', 'worker', 'invited', tp.id('A1'));
select tp.err($$update public.company_members set status = 'active' where user_id = tp.id('W')$$, 'P0001', 'vietos');
-- didinant apmokėtas vietas (Paddle webhook) atkurti galima
reset role;
update public.subscriptions set seats = 4 where company_id = tp.id('CX');
select tp.as_user('A1');
update public.company_members set status = 'active' where user_id = tp.id('W');
select tp.ok((public.plan_usage(tp.id('CX')) -> 'seats' ->> 'used')::int = 4, 'po atkūrimo užimtos 4 vietos');
-- sumažinus vietas esami nariai nepašalinami, bet naujų pridėti nebegalima
reset role;
update public.subscriptions set seats = 1 where company_id = tp.id('CX');
select tp.as_user('A1');
select tp.ok((select count(*) from public.company_members where company_id = tp.id('CX') and status = 'active') = 2, 'sumažinus vietas esami nariai lieka');
select tp.err($$insert into public.company_members (company_id, email, role, status, invited_by) values (tp.id('CX'), 'n4@x.lt', 'worker', 'invited', tp.id('A1'))$$, 'P0001', 'vietos');
reset role;

select 'PLANŲ TESTAI PRAĖJO' as rezultatas;
