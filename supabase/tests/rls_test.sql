-- SANTECHNITAS PRO · RLS ir verslo taisyklių testai
-- Paleidimas (švari PostgreSQL su Supabase "stub" – žr. docs/DUOMENU-BAZE.md): psql -v ON_ERROR_STOP=1 -f rls_test.sql
-- Kiekvienas testas arba išspausdina PASS, arba nutraukia vykdymą su FAIL.
\set ON_ERROR_STOP on
create schema t;
grant usage on schema t to authenticated;
create table t.ids (name text primary key, id uuid not null);
grant select, insert on t.ids to authenticated;
create function t.id(n text) returns uuid language sql stable as $$ select id from t.ids where name = n $$;
grant execute on function t.id(text) to authenticated;
create function t.as_user(n text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', (select id::text from t.ids where name = n), false);
  set role authenticated;
end $$;
create function t.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', msg; end if;
  raise notice 'PASS: %', msg;
end $$;
create function t.n(q text) returns bigint language plpgsql as $$
declare r bigint; begin execute q into r; return r; end $$;
create function t.err(q text, expected text) returns void language plpgsql as $$
begin
  begin
    execute q;
  exception when others then
    if sqlstate = expected then raise notice 'PASS: klaida % -> %', expected, left(q, 70); return; end if;
    raise exception 'FAIL: % davė % (%), laukta %', left(q, 70), sqlstate, sqlerrm, expected;
  end;
  raise exception 'FAIL: % nesustojo, laukta klaida %', left(q, 70), expected;
end $$;
create function t.rows(q text) returns bigint language plpgsql as $$
declare r bigint; begin execute q; get diagnostics r = row_count; return r; end $$;
grant execute on function t.ok(boolean, text), t.n(text), t.rows(text), t.err(text, text) to authenticated;

-- Naudotojai
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000000a', 'a@x.lt', now()),
  ('00000000-0000-0000-0000-00000000000b', 'b@y.lt', now()),
  ('00000000-0000-0000-0000-0000000000a1', 'w@x.lt', now()),
  ('00000000-0000-0000-0000-0000000000a2', 'u@x.lt', null);
insert into t.ids values
  ('A', '00000000-0000-0000-0000-00000000000a'), ('B', '00000000-0000-0000-0000-00000000000b'),
  ('W', '00000000-0000-0000-0000-0000000000a1'), ('U', '00000000-0000-0000-0000-0000000000a2');

-- 1. Įmonės ir bandymas
select t.as_user('A');
insert into t.ids select 'CX', public.create_company('Firma X');
select t.as_user('B');
insert into t.ids select 'CY', public.create_company('Firma Y');
select t.as_user('A');
select t.ok(public.company_has_access(t.id('CX')), 'nauja įmonė turi 14 dienų bandymą');
select t.ok(t.n($$select count(*) from public.companies$$) = 1, 'A mato tik savo įmonę');
select t.err($$update public.companies set trial_ends_at = now() + interval '5 years'$$, '42501');
select t.err($$update public.companies set complimentary = true$$, '42501');
select t.err($$insert into public.companies (name, created_by) values ('Hack', t.id('A'))$$, '42501');
-- pakartotinis bandymas tam pačiam el. paštui
insert into t.ids select 'CX2', public.create_company('Firma X2');
select t.ok((select trial_ends_at <= now() from public.companies where id = t.id('CX2')),
            'antra įmonė tuo pačiu el. paštu nebegauna nemokamo bandymo');
select t.ok(public.normalize_email('A.b+c@Gmail.com') = 'ab@gmail.com', 'el. pašto normalizavimas (gmail)');

-- 2. Nariai ir pakvietimai
insert into public.company_members (company_id, email, role, status, invited_by)
  values (t.id('CX'), 'w@x.lt', 'worker', 'invited', t.id('A'));
insert into public.company_members (company_id, email, role, status, invited_by)
  values (t.id('CX'), 'u@x.lt', 'worker', 'invited', t.id('A'));
select t.err($$insert into public.company_members (company_id, email, role, status) values (t.id('CX'), 'z@x.lt', 'owner', 'invited')$$, '42501');
select t.err($$update public.company_members set role = 'worker' where user_id = t.id('A') and company_id = t.id('CX')$$, '42501');
select t.ok(t.rows($$delete from public.company_members where role = 'owner'$$) = 0, 'savininko ištrinti negalima');
select t.as_user('U');
select t.ok(public.claim_invitations() = 0, 'nepatvirtintas el. paštas pakvietimo nepriima');
select t.as_user('W');
select t.ok(public.claim_invitations() = 1, 'patvirtintas el. paštas priima pakvietimą');
select t.err($$insert into public.company_members (company_id, email, role, status) values (t.id('CX'), 'q@x.lt', 'worker', 'invited')$$, '42501');
select t.ok(t.n($$select count(*) from public.profiles$$) = 2, 'darbuotojas mato savo ir įmonės kolegos profilį');
select t.as_user('B');
select t.ok(t.n($$select count(*) from public.profiles where id = t.id('A')$$) = 0, 'kita įmonė nemato svetimų profilių');

-- 3. Objektai ir darbai
select t.as_user('A');
insert into public.projects (id, company_id, name, address, order_no)
  values ('10000000-0000-0000-0000-000000000001', t.id('CX'), 'DTS montavimas', 'Pavyzdžio g. 1', '#1'),
         ('10000000-0000-0000-0000-000000000002', t.id('CX'), 'Kitas objektas', 'Pavyzdžio g. 2', '#2');
insert into public.tasks (id, company_id, project_id, title, assigned_to, scheduled_date)
  values ('20000000-0000-0000-0000-000000000001', t.id('CX'), '10000000-0000-0000-0000-000000000001', 'Montavimas', t.id('W'), current_date);
insert into public.task_checklist_items (company_id, task_id, title) values (t.id('CX'), '20000000-0000-0000-0000-000000000001', 'Pirmas žingsnis');
select t.as_user('B');
insert into public.projects (id, company_id, name) values ('10000000-0000-0000-0000-0000000000b1', t.id('CY'), 'Y objektas');
select t.ok(t.n($$select count(*) from public.projects$$) = 1 and t.n($$select count(*) from public.tasks$$) = 0, 'B mato tik savo objektus, svetimų darbų nemato');
select t.err($$insert into public.tasks (company_id, project_id, title) values (t.id('CY'), '10000000-0000-0000-0000-000000000001', 'x')$$, '23503');
select t.as_user('A');
select t.err($$insert into public.tasks (company_id, project_id, title) values (t.id('CX'), '10000000-0000-0000-0000-0000000000b1', 'x')$$, '23503');
select t.err($$insert into public.tasks (company_id, title, assigned_to) values (t.id('CX'), 'x', t.id('B'))$$, '23503');
select t.as_user('W');
select t.ok(t.n($$select count(*) from public.tasks$$) = 1, 'darbuotojas mato tik jam paskirtą darbą');
select t.ok(t.n($$select count(*) from public.projects$$) = 1, 'darbuotojas mato tik objektą su savo darbu');
select t.ok(t.n($$select count(*) from public.task_checklist_items$$) = 1, 'darbuotojas mato savo darbo užduočių sąrašą');
select t.err($$insert into public.projects (company_id, name) values (t.id('CX'), 'nauja')$$, '42501');
select t.err($$update public.tasks set title = 'pakeista'$$, '42501');
update public.tasks set status = 'done', scheduled_date = current_date + 1;
select t.ok((select completed_at is not null from public.tasks), 'užbaigimo laiką nustato serveris');
update public.task_checklist_items set is_done = true;
select t.ok(t.n($$select count(*) from public.task_checklist_items where is_done$$) = 1, 'darbuotojas žymi atliktus punktus');

-- 4. Darbo laikas, pertraukos
insert into public.time_entries (company_id, user_id, started_at) values (t.id('CX'), t.id('W'), now() - interval '2 hours');
select t.err($$insert into public.time_entries (company_id, user_id, started_at) values (t.id('CX'), t.id('W'), now())$$, '23505');
select t.err($$insert into public.time_entries (company_id, user_id, started_at) values (t.id('CX'), t.id('A'), now() - interval '1 hour')$$, '42501');
insert into public.breaks (company_id, time_entry_id, user_id, started_at)
  select company_id, id, t.id('B'), now() - interval '30 minutes' from public.time_entries;
select t.ok((select user_id = t.id('W') from public.breaks), 'pertraukos savininką nustato serveris, ne klientas');
select t.err($$insert into public.breaks (company_id, time_entry_id, started_at) select company_id, id, now() from public.time_entries$$, '23505');
update public.breaks set ended_at = now() - interval '20 minutes';
update public.time_entries set ended_at = now();
select t.ok((select worked_minutes between 108 and 111 from public.time_entry_summary), 'dirbtos minutės = laikas − pertrauka (~110 min.)');
select t.ok(t.rows($$update public.time_entries set ended_at = now() + interval '1 hour'$$) = 0, 'darbuotojas užbaigto laiko įrašo keisti negali');
select t.as_user('A');
select t.ok(t.n($$select count(*) from public.time_entries$$) = 1, 'administratorius mato darbuotojų laiką');
select t.as_user('B');
select t.ok(t.n($$select count(*) from public.time_entries$$) = 0, 'kita įmonė laiko nemato');

-- 5. Pastabos
select t.as_user('W');
insert into public.notes (company_id, author_id, body) values (t.id('CX'), t.id('W'), 'Trūksta vamzdžio');
select t.err($$insert into public.notes (company_id, author_id, body) values (t.id('CX'), t.id('A'), 'apsimetu')$$, '42501');
select t.err($$insert into public.notes (company_id, author_id, body) values (t.id('CX'), t.id('W'), '   ')$$, '23514');
select t.as_user('A');
select t.ok(t.n($$select count(*) from public.notes$$) = 1, 'administratorius mato pastabas biurui');
select t.as_user('B');
select t.ok(t.n($$select count(*) from public.notes$$) = 0, 'kita įmonė pastabų nemato');

-- 6. Medžiagos
select t.as_user('W');
insert into public.material_requests (id, company_id, employee_id, project_id, comment)
  values ('30000000-0000-0000-0000-000000000001', t.id('CX'), t.id('W'), '10000000-0000-0000-0000-000000000001', 'Skubiai');
insert into public.material_request_items (id, company_id, request_id, material_name, quantity, unit) values
  ('40000000-0000-0000-0000-000000000001', t.id('CX'), '30000000-0000-0000-0000-000000000001', 'Varinis vamzdis 15 mm', 15, 'm'),
  ('40000000-0000-0000-0000-000000000002', t.id('CX'), '30000000-0000-0000-0000-000000000001', 'Alkūnė 90°', 4, 'vnt.');
select t.err($$insert into public.material_request_items (company_id, request_id, material_name, quantity, unit) values (t.id('CX'), '30000000-0000-0000-0000-000000000001', 'x', -1, 'vnt.')$$, '23514');
select t.err($$insert into public.material_request_items (company_id, request_id, material_name, quantity, unit) values (t.id('CX'), '30000000-0000-0000-0000-000000000001', 'x', 1, 'tona')$$, '23514');
select t.ok(t.rows($$update public.material_request_items set status = 'purchased'$$) = 0, 'darbuotojas negali pažymėti „nupirkta“');
select t.as_user('B');
select t.ok(t.n($$select count(*) from public.material_request_items$$) = 0, 'kita įmonė medžiagų nemato');
select t.err($$insert into public.material_request_items (company_id, request_id, material_name, quantity, unit) values (t.id('CY'), '30000000-0000-0000-0000-000000000001', 'x', 1, 'vnt.')$$, '42501');
select t.as_user('A');
select t.ok(t.n($$select count(*) from public.material_request_items where status = 'needed'$$) = 2, 'administratorius mato visas trūkstamas medžiagas');
update public.material_request_items set status = 'purchased' where id = '40000000-0000-0000-0000-000000000001';
select t.ok((select purchased_by = t.id('A') and purchased_at is not null from public.material_request_items where id = '40000000-0000-0000-0000-000000000001'), 'pirkimą patvirtinęs administratorius ir data įrašomi');
select t.ok((select status = 'open' from public.material_requests), 'viena nupirkta medžiaga neuždaro viso prašymo');
update public.material_request_items set status = 'purchased' where id = '40000000-0000-0000-0000-000000000002';
select t.ok((select status = 'completed' from public.material_requests), 'visos nupirktos -> prašymas baigtas');
update public.material_request_items set status = 'needed' where id = '40000000-0000-0000-0000-000000000002';
select t.ok((select status = 'open' from public.material_requests) and (select purchased_at is null from public.material_request_items where id = '40000000-0000-0000-0000-000000000002'), 'pirkimą galima atšaukti');
update public.material_request_items set quantity = 20, material_name = 'Varinis vamzdis 18 mm' where id = '40000000-0000-0000-0000-000000000001';
select t.ok((select quantity = 20 and purchased_by = t.id('A') from public.material_request_items where id = '40000000-0000-0000-0000-000000000001'), 'administratorius redaguoja kiekį, pirkimo žymė išlieka');
select t.err($$update public.material_request_items set quantity = -1 where id = '40000000-0000-0000-0000-000000000001'$$, '23514');
update public.material_requests set comment = 'Pakeistas' where id = '30000000-0000-0000-0000-000000000001';
select t.ok((select comment = 'Pakeistas' from public.material_requests where id = '30000000-0000-0000-0000-000000000001'), 'administratorius redaguoja komentarą');
insert into public.material_request_items (id, company_id, request_id, material_name, quantity, unit) values
  ('40000000-0000-0000-0000-000000000009', t.id('CX'), '30000000-0000-0000-0000-000000000001', 'Plytelės', 3, 'm²');
select t.ok(t.n($$select count(*) from public.material_request_items where unit = 'm²'$$) = 1, 'papildomi matavimo vienetai (m²) leidžiami');
delete from public.material_request_items where id = '40000000-0000-0000-0000-000000000009';
select t.as_user('W');
select t.ok(t.n($$select count(*) from public.material_request_items where status = 'purchased'$$) = 1, 'darbuotojas mato savo prašymo būseną');

-- 6b. Medžiagų prašymas viena operacija
select t.as_user('W');
select t.ok(public.create_material_request(t.id('CX'), '10000000-0000-0000-0000-000000000001', 'Rytoj',
  '[{"name":"Jungtis","quantity":6,"unit":"vnt."},{"name":"Kabelis 5x2,5","quantity":20,"unit":"m"}]'::jsonb) is not null,
  'RPC sukuria prašymą su keliomis medžiagomis');
select t.ok(t.n($$select count(*) from public.material_request_items where material_name = 'Jungtis'$$) = 1, 'RPC sukūrė medžiagų eilutes');
select t.err($$select public.create_material_request(t.id('CX'), null, null, '[]'::jsonb)$$, '22023');
select t.err($$select public.create_material_request(t.id('CX'), null, null, '[{"name":"x","quantity":-2,"unit":"m"}]'::jsonb)$$, '23514');
select t.ok(t.n($$select count(*) from public.material_requests where comment is null and project_id is null$$) = 0, 'nesėkmingas RPC nepalieka tuščio prašymo');
select t.as_user('B');
select t.err($$select public.create_material_request(t.id('CX'), null, null, '[{"name":"x","quantity":1,"unit":"m"}]'::jsonb)$$, '42501');

-- 7. Prenumeratos ir prieigos baigtis
reset role;
insert into public.subscriptions (company_id, stripe_customer_id, status, plan_interval, seats) values (t.id('CX'), 'cus_test', 'active', 'month', 2);
select t.as_user('A');
select t.ok(t.n($$select count(*) from public.subscriptions$$) = 1, 'administratorius mato savo prenumeratą');
select t.err($$update public.subscriptions set status = 'active'$$, '42501');
select t.err($$insert into public.payments (company_id, stripe_invoice_id, amount_cents, status) values (t.id('CX'), 'in_1', 300, 'paid')$$, '42501');
select t.as_user('W');
select t.ok(t.n($$select count(*) from public.subscriptions$$) = 0, 'darbuotojas prenumeratos nemato');
reset role;
delete from public.subscriptions;
update public.companies set trial_ends_at = now() - interval '1 day' where id = t.id('CX');
select t.as_user('W');
select t.ok(not public.company_has_access(t.id('CX')), 'pasibaigus bandymui prieigos nebėra');
select t.err($$insert into public.notes (company_id, author_id, body) values (t.id('CX'), t.id('W'), 'po bandymo')$$, '42501');
select t.ok(t.n($$select count(*) from public.notes$$) = 1, 'pasibaigus bandymui duomenys lieka matomi (skaitymas leidžiamas)');
reset role;
insert into public.subscriptions (company_id, stripe_customer_id, status) values (t.id('CX'), 'cus_test', 'active');
select t.as_user('W');
select t.ok(public.company_has_access(t.id('CX')), 'aktyvi prenumerata atstato prieigą');
insert into public.notes (company_id, author_id, body) values (t.id('CX'), t.id('W'), 'po apmokėjimo');

-- 8. Saugykla
reset role;
select t.ok(public.storage_company_id('nera-uuid/failas.jpg') is null, 'neteisingas failo kelias atmetamas');
select t.ok(public.storage_company_id(t.id('CX')::text || '/a.jpg') = t.id('CX'), 'failo kelias -> įmonės ID');

-- 8b. Laiko apskaitos režimas
select t.as_user('A');
update public.companies set time_mode = 'project' where id = t.id('CX');
select t.ok((select time_mode = 'project' from public.companies where id = t.id('CX')), 'administratorius keičia įmonės laiko režimą');
select t.ok(t.rows($$update public.company_members set time_mode = 'hours' where user_id = t.id('W')$$) = 1, 'administratorius nustato darbuotojo režimą');
select t.err($$update public.company_members set time_mode = 'blogas' where user_id = t.id('W')$$, '23514');
select t.as_user('W');
select t.ok(t.rows($$update public.companies set time_mode = 'hours' where id = t.id('CX')$$) = 0, 'darbuotojas įmonės režimo keisti negali');
select t.ok(t.rows($$update public.company_members set time_mode = 'project' where user_id = t.id('W')$$) = 0, 'darbuotojas savo režimo keisti negali');
select t.ok(public.effective_time_mode(t.id('CX')) = 'hours', 'galioja darbuotojo nustatymas, o ne įmonės numatytasis');
select t.as_user('A');
update public.company_members set time_mode = null where user_id = t.id('W');
select t.as_user('W');
select t.ok(public.effective_time_mode(t.id('CX')) = 'project', 'be asmeninio nustatymo galioja įmonės režimas');

-- 9. Anon neturi prieigos
set role anon;
do $$ begin
  begin
    perform 1 from public.tasks;
    raise exception 'FAIL: anon gali skaityti tasks';
  exception when insufficient_privilege then
    raise notice 'PASS: neprisijungęs naudotojas (anon) duomenų nemato';
  end;
end $$;
reset role;
\echo ==== VISI TESTAI PRAĖJO ====
