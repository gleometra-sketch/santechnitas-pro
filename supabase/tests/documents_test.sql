-- SANTECHNITAS PRO · Sąmatų ir sutarčių (0020_documents.sql) testai
-- Paleidžiama po migracijų (žr. run.sh). Kiekvienas testas arba išspausdina PASS, arba nutraukia vykdymą su FAIL.
\set ON_ERROR_STOP on
reset role;
create schema td;
grant usage on schema td to authenticated, service_role, anon;
create table td.ids (name text primary key, id uuid not null);
grant select, insert on td.ids to authenticated, service_role, anon;
create function td.id(n text) returns uuid language sql stable as $$ select id from td.ids where name = n $$;
create function td.as_user(n text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', (select id::text from td.ids where name = n), false);
  set role authenticated;
end $$;
create function td.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', msg; end if;
  raise notice 'PASS: %', msg;
end $$;
create function td.n(q text) returns bigint language plpgsql as $$
declare r bigint; begin execute q into r; return r; end $$;
create function td.txt(q text) returns text language plpgsql as $$
declare r text; begin execute q into r; return r; end $$;
-- tikisi klaidos su konkrečiu kodu ir (jei nurodyta) žinutės dalimi
create function td.err(q text, expected text, msg_part text default null) returns void language plpgsql as $$
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
grant execute on function td.ok(boolean, text), td.n(text), td.txt(text), td.err(text, text, text) to authenticated, service_role, anon;

-- Naudotojai: A1, A2 – vienos įmonės administratoriai; W – darbuotojas; B – kitos įmonės administratorius
insert into auth.users (id, email, email_confirmed_at) values
  ('d0000000-0000-0000-0000-0000000000a1', 'doc-a1@x.lt', now()),
  ('d0000000-0000-0000-0000-0000000000a2', 'doc-a2@x.lt', now()),
  ('d0000000-0000-0000-0000-0000000000a3', 'doc-w@x.lt', now()),
  ('d0000000-0000-0000-0000-0000000000b1', 'doc-b@y.lt', now());
insert into td.ids values
  ('A1', 'd0000000-0000-0000-0000-0000000000a1'), ('A2', 'd0000000-0000-0000-0000-0000000000a2'),
  ('W', 'd0000000-0000-0000-0000-0000000000a3'), ('B', 'd0000000-0000-0000-0000-0000000000b1');

select td.as_user('A1');
insert into td.ids select 'CX', public.create_company('Dokumentų firma X');
select td.as_user('B');
insert into td.ids select 'CY', public.create_company('Dokumentų firma Y');
reset role;
insert into public.company_members (company_id, user_id, email, role, status) values
  (td.id('CX'), td.id('A2'), 'doc-a2@x.lt', 'admin', 'active'),
  (td.id('CX'), td.id('W'), 'doc-w@x.lt', 'worker', 'active');
-- objektai
insert into public.projects (id, company_id, name, created_by) values
  ('d1000000-0000-0000-0000-000000000001', td.id('CX'), 'Objektas X', td.id('A1')),
  ('d1000000-0000-0000-0000-000000000002', td.id('CY'), 'Objektas Y', td.id('B'));

-- 1. Sąmata: sumas skaičiuoja serveris
select td.as_user('A1');
insert into td.ids select 'E1', public.save_document(null,
  jsonb_build_object('company_id', td.id('CX'), 'kind', 'estimate', 'title', 'Sąmata vonios remontui', 'client_name', 'Jonas Jonaitis',
                     'vat_rate', 21, 'project_id', 'd1000000-0000-0000-0000-000000000001'),
  '[{"description":"Vamzdžiai","quantity":2.5,"unit":"m","unit_price":10.50},{"description":"Darbas","quantity":3,"unit":"val.","unit_price":19.99}]'::jsonb);
select td.ok((select total_net = 86.22 and total_vat = 18.11 and total_gross = 104.33 from public.documents where id = td.id('E1')),
             'sąmatos sumos: 26,25 + 59,97 = 86,22; PVM 21 % = 18,11; viso 104,33');
select td.ok((select number = 'S-' || extract(year from public.vilnius_date(now()))::int || '-0001' from public.documents where id = td.id('E1')),
             'pirma sąmata gauna numerį S-<metai>-0001');
insert into td.ids select 'E2', public.save_document(null,
  jsonb_build_object('company_id', td.id('CX'), 'kind', 'estimate', 'title', 'Antra', 'client_name', 'Ona', 'vat_rate', 0),
  '[{"description":"Vienas","quantity":1,"unit":"vnt.","unit_price":100}]'::jsonb);
select td.ok((select number like '%-0002' and total_vat = 0 and total_gross = 100 from public.documents where id = td.id('E2')), 'antra sąmata -0002, be PVM');

-- 2. Sutartis iš bendros sumos
insert into td.ids select 'C1', public.save_document(null,
  jsonb_build_object('company_id', td.id('CX'), 'kind', 'contract', 'title', 'Sutartis', 'client_name', 'Jonas Jonaitis', 'vat_rate', 21,
                     'total_gross', 1210, 'estimate_id', td.id('E1'), 'body', 'Sutarties tekstas'), '[]'::jsonb);
select td.ok((select total_net = 1000 and total_vat = 210 and total_gross = 1210 and number like 'SUT-%-0001' from public.documents where id = td.id('C1')),
             'sutarties sumos iš 1210 su 21 % PVM: 1000 + 210; numeris SUT-<metai>-0001');

-- 3. Juodraštį galima redaguoti
select public.save_document(td.id('E2'),
  jsonb_build_object('company_id', td.id('CX'), 'kind', 'estimate', 'title', 'Antra (pakeista)', 'client_name', 'Ona', 'vat_rate', 21),
  '[{"description":"Du","quantity":2,"unit":"vnt.","unit_price":50}]'::jsonb);
select td.ok((select title = 'Antra (pakeista)' and total_gross = 121 and (select count(*) from public.document_items where document_id = td.id('E2')) = 1
                from public.documents where id = td.id('E2')), 'juodraštis redaguojamas, eilutės pakeičiamos');

-- 4. Teisės ir izoliacija
select td.as_user('W');
select td.ok(td.n($$select count(*) from public.documents$$) = 0, 'darbuotojas dokumentų nemato');
select td.err($$select public.save_document(null, '{"kind":"estimate"}'::jsonb, '[]'::jsonb)$$, 'P0001');
select td.err($$select public.send_document(td.id('E1'), repeat('a', 40))$$, 'P0001', 'Neturite teisės');
select td.err($$select public.save_company_profile(td.id('CX'), '{}'::jsonb)$$, 'P0001', 'Neturite teisės');
select td.as_user('B');
select td.ok(td.n($$select count(*) from public.documents$$) = 0, 'kitos įmonės administratorius dokumentų nemato');
select td.err($$select public.send_document(td.id('E1'), repeat('a', 40))$$, 'P0001', 'Neturite teisės');
select td.err($$select public.cancel_document(td.id('E1'))$$, 'P0001');
select td.err($$select public.duplicate_document(td.id('E1'))$$, 'P0001');
select td.err($$select public.save_document(null, jsonb_build_object('company_id', td.id('CX'), 'kind', 'estimate', 'title', 'X', 'client_name', 'Y'), '[]'::jsonb)$$, 'P0001', 'Neturite teisės');
select td.err($$insert into public.documents (company_id, kind, title, client_name) values (td.id('CY'), 'estimate', 'tiesiogiai', 'x')$$, '42501');
select td.err($$update public.documents set title = 'hack'$$, '42501');
select td.err($$select public.document_respond('x', 'approved', 'Vardas Pavardė', '', '')$$, '42501');
-- kitos įmonės objekto negalima priskirti
select td.as_user('A1');
select td.err($$select public.save_document(null, jsonb_build_object('company_id', td.id('CX'), 'kind', 'estimate', 'title', 'X', 'client_name', 'Y',
                 'project_id', 'd1000000-0000-0000-0000-000000000002'), '[{"description":"a","quantity":1,"unit_price":1}]'::jsonb)$$, '23503');
select td.ok(td.n($$select count(*) from public.documents$$) = 3, 'administratorius mato savo įmonės 3 dokumentus');
set role anon;
select td.err($$select count(*) from public.documents$$, '42501');
select td.err($$select public.send_document(td.id('E1'), repeat('a', 40))$$, '42501');

-- 5. Siuntimas: nuoroda, rekvizitų kopija, pranešimas kitam administratoriui
select td.as_user('A1');
select public.save_company_profile(td.id('CX'), '{"legal_name":"UAB Santechnika","code":"123456789","vat_code":"LT123456789","address":"Vilnius","phone":"+37060000000","email":"a@x.lt","iban":"LT000000000000000000"}'::jsonb);
select td.err($$select public.send_document(td.id('C1'), repeat('a', 10))$$, 'P0001', 'Neteisingas kodas');
select td.ok(public.send_document(td.id('E1'), 'tokenE1' || repeat('x', 40)) = 'tokenE1' || repeat('x', 40), 'siuntimas grąžina nuorodos kodą');
select td.ok((select status = 'sent' and sent_at is not null and seller->>'legal_name' = 'UAB Santechnika' and public_token = 'tokenE1' || repeat('x', 40)
                from public.documents where id = td.id('E1')), 'išsiųsta: būsena, laikas, rekvizitų kopija ir kodas išsaugoti');
select td.ok(public.send_document(td.id('E1'), 'kitas' || repeat('y', 40)) = 'tokenE1' || repeat('x', 40), 'pakartotinis siuntimas grąžina tą pačią nuorodą');
select public.save_company_profile(td.id('CX'), '{"legal_name":"UAB Pakeista"}'::jsonb);
select public.send_document(td.id('E1'), 'trecias' || repeat('z', 40));
select td.ok((select seller->>'legal_name' = 'UAB Santechnika' from public.documents where id = td.id('E1')), 'pakartotinis siuntimas nekeičia išsiuntimo metu išsaugotų rekvizitų');
select td.ok((select count(*) from public.document_events where document_id = td.id('E1') and event = 'sent') = 1, 'pakartotinis siuntimas nekartoja įvykio žurnale');
reset role;
select td.ok((select count(*) from public.notification_outbox where event_type = 'document_status' and user_id = td.id('A2')) = 1,
             'išsiuntus, kitas administratorius gauna pranešimą');
select td.ok((select count(*) from public.notification_outbox where event_type = 'document_status' and user_id = td.id('A1')) = 0,
             'išsiuntęs administratorius pats sau nepraneša');
select td.ok((select count(*) from public.notification_outbox where event_type = 'document_status' and user_id = td.id('W')) = 0,
             'darbuotojas dokumentų pranešimų negauna');
select td.as_user('A1');
select td.err($$select public.save_document(td.id('E1'), jsonb_build_object('company_id', td.id('CX'), 'kind', 'estimate', 'title', 'x', 'client_name', 'y'), '[]'::jsonb)$$, 'P0001', 'tik juodraštį');
select td.err($$select public.delete_document(td.id('E1'))$$, 'P0001', 'ištrinti negalima');

-- 6. Kliento atsakymas (tik service_role)
select td.err($$select public.document_respond('tokenE1' || repeat('x', 40), 'approved', 'Jonas Jonaitis', '', '1.2.3.4')$$, '42501');
reset role;
set role service_role;
select td.err($$select public.document_respond('neegzistuoja', 'approved', 'Jonas Jonaitis', '', '')$$, 'P0001', 'Nuoroda negalioja');
select td.err($$select public.document_respond('tokenE1' || repeat('x', 40), 'approved', 'Jo', '', '')$$, 'P0001', 'vardą ir pavardę');
select td.err($$select public.document_respond('tokenE1' || repeat('x', 40), 'maybe', 'Jonas Jonaitis', '', '')$$, 'P0001', 'Neteisingas sprendimas');
select td.ok(public.document_respond('tokenE1' || repeat('x', 40), 'approved', ' Jonas Jonaitis ', 'Viskas gerai', '203.0.113.7') like 'S-%-0001', 'klientas patvirtina; grąžinamas dokumento numeris');
select td.err($$select public.document_respond('tokenE1' || repeat('x', 40), 'declined', 'Jonas Jonaitis', '', '')$$, 'P0001', 'jau atsakyta');
reset role;
select td.ok((select status = 'approved' and responded_name = 'Jonas Jonaitis' and response_note = 'Viskas gerai' and responded_ip = '203.0.113.7' and responded_at is not null
                from public.documents where id = td.id('E1')), 'patvirtinimas išsaugo vardą, pastabą, IP ir laiką');
select td.ok((select count(*) from public.document_events where document_id = td.id('E1') and event in ('sent', 'approved')) = 2, 'įvykių žurnale yra išsiuntimas ir patvirtinimas');
select td.ok((select count(*) from public.notification_outbox where event_type = 'document_status' and user_id = td.id('A1')) = 1
         and (select count(*) from public.notification_outbox where event_type = 'document_status' and user_id = td.id('A2')) = 2,
             'klientui patvirtinus, abu administratoriai gauna pranešimą');
select td.as_user('A1');
select td.err($$select public.cancel_document(td.id('E1'))$$, 'P0001', 'išsiųstą');
select td.err($$select public.delete_document(td.id('E1'))$$, 'P0001', 'ištrinti negalima');

-- 7. Atmetimas, atšaukimas, galiojimas, ištrynimas
select public.send_document(td.id('E2'), 'tokenE2' || repeat('x', 40));
reset role; set role service_role;
select td.ok(public.document_respond('tokenE2' || repeat('x', 40), 'declined', '', 'Per brangu', '') like 'S-%-0002', 'klientas gali atmesti be vardo');
reset role;
select td.ok((select status = 'declined' and response_note = 'Per brangu' from public.documents where id = td.id('E2')), 'atmetimo priežastis išsaugota');
select td.as_user('A1');
select public.delete_document(td.id('E2'));
select td.ok(td.n($$select count(*) from public.documents where id = td.id('E2')$$) = 0, 'atmestą dokumentą galima ištrinti');
select td.ok(td.n($$select count(*) from public.document_items where document_id = td.id('E2')$$) = 0, 'ištrynus dokumentą dingsta ir eilutės');

insert into td.ids select 'C2', public.duplicate_document(td.id('E1'));
select td.ok((select status = 'draft' and number like 'S-%-0003' and public_token is null and total_gross = 104.33
                and (select count(*) from public.document_items where document_id = c.id) = 2 from public.documents c where c.id = td.id('C2')),
             'kopija: naujas juodraštis, naujas numeris, be nuorodos, su eilutėmis ir sumomis');
select public.send_document(td.id('C2'), 'tokenC2' || repeat('x', 40));
select public.cancel_document(td.id('C2'));
select td.ok((select status = 'cancelled' from public.documents where id = td.id('C2')), 'išsiųstą dokumentą galima atšaukti');
reset role; set role service_role;
select td.err($$select public.document_respond('tokenC2' || repeat('x', 40), 'approved', 'Jonas Jonaitis', '', '')$$, 'P0001', 'nebegalima');
reset role;

select td.as_user('A1');
insert into td.ids select 'E4', public.save_document(null, jsonb_build_object('company_id', td.id('CX'), 'kind', 'estimate', 'title', 'Senas', 'client_name', 'Petras', 'vat_rate', 21),
  '[{"description":"x","quantity":1,"unit":"vnt.","unit_price":10}]'::jsonb);
select public.send_document(td.id('E4'), 'tokenE4' || repeat('x', 40));
reset role;
update public.documents set valid_until = public.vilnius_date(now()) - 1 where id = td.id('E4');
set role service_role;
select td.err($$select public.document_respond('tokenE4' || repeat('x', 40), 'approved', 'Petras Petraitis', '', '')$$, 'P0001', 'galiojimas pasibaigęs');
reset role;
update public.documents set valid_until = public.vilnius_date(now()) where id = td.id('E4');
set role service_role;
select td.ok(public.document_respond('tokenE4' || repeat('x', 40), 'approved', 'Petras Petraitis', '', '') is not null, 'paskutinę galiojimo dieną dar galima patvirtinti');
reset role;

-- 8. Sustabdyta įmonės prieiga: administratorius nebegali keisti dokumentų
update public.companies set trial_ends_at = now() - interval '2 days', complimentary = false where id = td.id('CX');
select td.as_user('A1');
select td.err($$select public.save_document(null, jsonb_build_object('company_id', td.id('CX'), 'kind', 'estimate', 'title', 'X', 'client_name', 'Y'), '[{"description":"a","quantity":1,"unit_price":1}]'::jsonb)$$, 'P0001', 'prieiga sustabdyta');
reset role;

-- 9. Kiti apribojimai
select td.as_user('A1');
select td.err($$insert into public.company_profiles (company_id, legal_name) values (td.id('CX'), 'hack')$$, '42501');
reset role;
select td.err($$update public.documents set status = 'weird' where id = td.id('E4')$$, '23514');
do $$ begin raise notice '==== DOKUMENTŲ TESTAI PRAĖJO ===='; end $$;
