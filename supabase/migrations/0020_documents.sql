-- DarboRitmas · 0020 · Sąmatos ir sutartys su klientais
-- Dokumentus kuria ir tvarko tik administratorius (owner/admin), visi rašymai vyksta per funkcijas.
-- Reikalavimai: 0001 (is_company_admin, vilnius_date, set_updated_at), 0002 (company_has_access), 0003 (projects), 0014_notifications (enqueue_notification).
-- Klientas atidaro viešą nuorodą (atsitiktinis kodas), peržiūri dokumentą ir jį patvirtina arba atmeta;
-- patvirtinimą įrašo serveris per document_respond() (service_role). Administratoriai gauna pranešimą (document_status).

-- ---------------------------------------------------------------- pagalbinė funkcija pranešimams
-- Įrašo pranešimą visiems aktyviems įmonės administratoriams (išskyrus p_except); grąžina gavėjų skaičių.
-- Sukuriama tik jei dar nėra (kitoje migracijų šakoje ji gali būti apibrėžta), todėl migracija saugi bet kuriuo atveju.
do $do$
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'notify_admins'
  ) then
    execute $f$
      create function public.notify_admins(p_company uuid, p_event text, p_title text, p_body text, p_data jsonb, p_except uuid default null)
      returns integer
      language plpgsql security definer set search_path = public as $body$
      declare a record; n integer := 0;
      begin
        for a in
          select m.user_id from public.company_members m
           where m.company_id = p_company and m.status = 'active' and m.role in ('owner', 'admin')
             and m.user_id is not null and m.user_id is distinct from p_except
        loop
          perform public.enqueue_notification(p_company, a.user_id, p_event, p_title, p_body, p_data);
          n := n + 1;
        end loop;
        return n;
      end $body$
    $f$;
    revoke execute on function public.notify_admins(uuid, text, text, text, jsonb, uuid) from public, anon, authenticated;
    grant  execute on function public.notify_admins(uuid, text, text, text, jsonb, uuid) to service_role;
  end if;
end $do$;

-- ---------------------------------------------------------------- lentelės
create table public.company_profiles (        -- įmonės rekvizitai sąmatoms ir sutartims
  company_id uuid primary key references public.companies (id) on delete cascade,
  legal_name text check (char_length(legal_name) <= 200),
  code       text check (char_length(code) <= 30),         -- įmonės / veiklos kodas
  vat_code   text check (char_length(vat_code) <= 30),
  address    text check (char_length(address) <= 300),
  phone      text check (char_length(phone) <= 40),
  email      text check (char_length(email) <= 200),
  iban       text check (char_length(iban) <= 40),
  updated_at timestamptz not null default now()
);

create table public.document_counters (
  company_id uuid not null references public.companies (id) on delete cascade,
  kind       text not null,
  year       integer not null,
  last       integer not null default 0,
  primary key (company_id, kind, year)
);

create table public.documents (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies (id) on delete cascade,
  project_id     uuid,
  estimate_id    uuid,                                      -- sutarties susieta sąmata
  kind           text not null check (kind in ('estimate', 'contract')),
  number         text not null default '',
  title          text not null check (char_length(btrim(title)) between 1 and 200),
  status         text not null default 'draft' check (status in ('draft', 'sent', 'approved', 'declined', 'cancelled')),
  client_name    text not null check (char_length(btrim(client_name)) between 1 and 160),
  client_email   text check (char_length(client_email) <= 200),
  client_phone   text check (char_length(client_phone) <= 40),
  client_address text check (char_length(client_address) <= 300),
  work_address   text check (char_length(work_address) <= 300),
  vat_rate       numeric(5, 2) not null default 21 check (vat_rate between 0 and 100),
  valid_until    date,
  notes          text check (char_length(notes) <= 4000),
  body           text check (char_length(body) <= 40000),   -- sutarties tekstas
  total_net      numeric(12, 2) not null default 0,
  total_vat      numeric(12, 2) not null default 0,
  total_gross    numeric(12, 2) not null default 0,
  seller         jsonb not null default '{}'::jsonb,        -- įmonės rekvizitų kopija išsiuntimo metu
  public_token   text unique,
  sent_at        timestamptz,
  responded_at   timestamptz,
  responded_name text check (char_length(responded_name) <= 160),
  response_note  text check (char_length(response_note) <= 1000),
  responded_ip   text check (char_length(responded_ip) <= 80),
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, company_id),
  unique (company_id, number),
  foreign key (project_id, company_id)  references public.projects (id, company_id)  on delete set null (project_id),
  foreign key (estimate_id, company_id) references public.documents (id, company_id) on delete set null (estimate_id)
);
create index documents_company_idx on public.documents (company_id, created_at desc);
create index documents_project_idx on public.documents (project_id) where project_id is not null;
create trigger documents_updated before update on public.documents for each row execute function public.set_updated_at();

create table public.document_items (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null,
  document_id uuid not null,
  position    integer not null,
  description text not null check (char_length(btrim(description)) between 1 and 500),
  quantity    numeric(12, 3) not null default 1 check (quantity >= 0),
  unit        text not null default 'vnt.' check (char_length(unit) <= 20),
  unit_price  numeric(12, 2) not null default 0 check (unit_price >= 0),
  foreign key (document_id, company_id) references public.documents (id, company_id) on delete cascade
);
create index document_items_doc_idx on public.document_items (document_id, position);

create table public.document_events (
  id          bigint generated always as identity primary key,
  company_id  uuid not null,
  document_id uuid not null,
  event       text not null,
  actor       text,
  detail      text,
  created_at  timestamptz not null default now(),
  foreign key (document_id, company_id) references public.documents (id, company_id) on delete cascade
);
create index document_events_doc_idx on public.document_events (document_id, created_at);

-- ---------------------------------------------------------------- numeracija
create function public.next_document_number(p_company uuid, p_kind text) returns text
language plpgsql security definer set search_path = public as $$
declare y integer := extract(year from public.vilnius_date(now()))::integer; n integer;
begin
  insert into public.document_counters (company_id, kind, year, last) values (p_company, p_kind, y, 1)
  on conflict (company_id, kind, year) do update set last = public.document_counters.last + 1
  returning last into n;
  return (case p_kind when 'estimate' then 'S' else 'SUT' end) || '-' || y || '-' || lpad(n::text, 4, '0');
end $$;

create function public.documents_number() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.number = '' then new.number := public.next_document_number(new.company_id, new.kind); end if;
  return new;
end $$;
create trigger documents_number before insert on public.documents for each row execute function public.documents_number();

-- ---------------------------------------------------------------- RLS: mato tik administratorius, rašoma per funkcijas
alter table public.company_profiles  enable row level security;
alter table public.document_counters enable row level security;
alter table public.documents         enable row level security;
alter table public.document_items    enable row level security;
alter table public.document_events   enable row level security;

create policy company_profiles_select on public.company_profiles for select to authenticated using (public.is_company_admin(company_id));
create policy documents_select        on public.documents        for select to authenticated using (public.is_company_admin(company_id));
create policy document_items_select   on public.document_items   for select to authenticated using (public.is_company_admin(company_id));
create policy document_events_select  on public.document_events  for select to authenticated using (public.is_company_admin(company_id));

revoke all on public.company_profiles, public.document_counters, public.documents, public.document_items, public.document_events from anon, authenticated;
grant select on public.company_profiles, public.documents, public.document_items, public.document_events to authenticated;

-- ---------------------------------------------------------------- funkcijos (administratorius)
create function public.doc_guard(p_company uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_company is null or not public.is_company_admin(p_company) then raise exception 'Neturite teisės.'; end if;
  if not public.company_has_access(p_company) then raise exception 'Įmonės prieiga sustabdyta.'; end if;
end $$;

create function public.doc_log(p_doc public.documents, p_event text, p_actor text, p_detail text) returns void
language sql security definer set search_path = public as $$
  insert into public.document_events (company_id, document_id, event, actor, detail) values (p_doc.company_id, p_doc.id, p_event, p_actor, p_detail);
$$;

create function public.save_company_profile(p_company uuid, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.doc_guard(p_company);
  insert into public.company_profiles (company_id, legal_name, code, vat_code, address, phone, email, iban)
  values (p_company, nullif(btrim(p->>'legal_name'), ''), nullif(btrim(p->>'code'), ''), nullif(btrim(p->>'vat_code'), ''),
          nullif(btrim(p->>'address'), ''), nullif(btrim(p->>'phone'), ''), nullif(btrim(p->>'email'), ''), nullif(btrim(p->>'iban'), ''))
  on conflict (company_id) do update set legal_name = excluded.legal_name, code = excluded.code, vat_code = excluded.vat_code,
    address = excluded.address, phone = excluded.phone, email = excluded.email, iban = excluded.iban, updated_at = now();
end $$;

-- Sukuria arba atnaujina juodraštį su eilutėmis; sumas skaičiuoja serveris.
create function public.save_document(p_id uuid, p_doc jsonb, p_items jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_company uuid := (p_doc->>'company_id')::uuid;
  v_kind text := p_doc->>'kind';
  v_id uuid; d public.documents; it jsonb; i integer := 0;
  v_vat numeric := coalesce(nullif(p_doc->>'vat_rate', '')::numeric, 21);
  v_net numeric := 0; v_vat_amt numeric; v_gross numeric;
begin
  perform public.doc_guard(v_company);
  if v_kind not in ('estimate', 'contract') then raise exception 'Neteisinga dokumento rūšis.'; end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) > 200 then raise exception 'Per daug eilučių (daugiausia 200).'; end if;

  if v_kind = 'estimate' then
    for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
      v_net := v_net + round((it->>'quantity')::numeric * (it->>'unit_price')::numeric, 2);
    end loop;
    v_vat_amt := round(v_net * v_vat / 100, 2);
    v_gross := v_net + v_vat_amt;
  else
    v_gross := coalesce(nullif(p_doc->>'total_gross', '')::numeric, 0);
    v_net := round(v_gross / (1 + v_vat / 100), 2);
    v_vat_amt := v_gross - v_net;
  end if;

  if p_id is null then
    insert into public.documents (company_id, project_id, estimate_id, kind, title, client_name, client_email, client_phone, client_address,
                                  work_address, vat_rate, valid_until, notes, body, total_net, total_vat, total_gross, created_by)
    values (v_company, nullif(p_doc->>'project_id', '')::uuid, nullif(p_doc->>'estimate_id', '')::uuid, v_kind,
            btrim(p_doc->>'title'), btrim(p_doc->>'client_name'), nullif(btrim(p_doc->>'client_email'), ''), nullif(btrim(p_doc->>'client_phone'), ''),
            nullif(btrim(p_doc->>'client_address'), ''), nullif(btrim(p_doc->>'work_address'), ''), v_vat, nullif(p_doc->>'valid_until', '')::date,
            nullif(btrim(p_doc->>'notes'), ''), nullif(p_doc->>'body', ''), v_net, v_vat_amt, v_gross, auth.uid())
    returning id into v_id;
  else
    select * into d from public.documents where id = p_id and company_id = v_company for update;
    if not found then raise exception 'Dokumentas nerastas.'; end if;
    if d.status <> 'draft' then raise exception 'Redaguoti galima tik juodraštį.'; end if;
    update public.documents set
      project_id = nullif(p_doc->>'project_id', '')::uuid, estimate_id = nullif(p_doc->>'estimate_id', '')::uuid,
      title = btrim(p_doc->>'title'), client_name = btrim(p_doc->>'client_name'),
      client_email = nullif(btrim(p_doc->>'client_email'), ''), client_phone = nullif(btrim(p_doc->>'client_phone'), ''),
      client_address = nullif(btrim(p_doc->>'client_address'), ''), work_address = nullif(btrim(p_doc->>'work_address'), ''),
      vat_rate = v_vat, valid_until = nullif(p_doc->>'valid_until', '')::date, notes = nullif(btrim(p_doc->>'notes'), ''),
      body = nullif(p_doc->>'body', ''), total_net = v_net, total_vat = v_vat_amt, total_gross = v_gross
    where id = p_id;
    v_id := p_id;
    delete from public.document_items where document_id = v_id;
  end if;

  if v_kind = 'estimate' then
    for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
      i := i + 1;
      insert into public.document_items (company_id, document_id, position, description, quantity, unit, unit_price)
      values (v_company, v_id, i, btrim(it->>'description'), (it->>'quantity')::numeric,
              coalesce(nullif(btrim(it->>'unit'), ''), 'vnt.'), (it->>'unit_price')::numeric);
    end loop;
  end if;
  return v_id;
end $$;

-- Pažymi dokumentą išsiųstu: sukuria viešą nuorodos kodą (jei dar nėra) ir išsaugo įmonės rekvizitų kopiją.
create function public.send_document(p_id uuid, p_token text) returns text
language plpgsql security definer set search_path = public as $$
declare d public.documents; v_company uuid; v_seller jsonb; v_items integer; v_name text;
begin
  select company_id into v_company from public.documents where id = p_id;
  perform public.doc_guard(v_company);
  select * into d from public.documents where id = p_id and company_id = v_company for update;
  if d.status not in ('draft', 'sent') then raise exception 'Šio dokumento išsiųsti nebegalima.'; end if;
  -- Jau išsiųstas: grąžiname tą pačią nuorodą. Rekvizitų kopijos nekeičiame ir pranešimo nekartojame.
  if d.status = 'sent' then return d.public_token; end if;
  if d.kind = 'estimate' then
    select count(*) into v_items from public.document_items where document_id = p_id;
    if v_items = 0 then raise exception 'Sąmatoje nėra eilučių.'; end if;
  elsif coalesce(btrim(d.body), '') = '' then
    raise exception 'Sutarties tekstas tuščias.';
  end if;
  if char_length(p_token) < 32 then raise exception 'Neteisingas kodas.'; end if;

  select coalesce(jsonb_build_object('legal_name', coalesce(cp.legal_name, c.name), 'code', cp.code, 'vat_code', cp.vat_code,
           'address', cp.address, 'phone', cp.phone, 'email', cp.email, 'iban', cp.iban), '{}'::jsonb)
    into v_seller from public.companies c left join public.company_profiles cp on cp.company_id = c.id where c.id = v_company;

  update public.documents set status = 'sent', public_token = coalesce(public_token, p_token), seller = v_seller,
         sent_at = coalesce(sent_at, now()) where id = p_id returning * into d;
  select coalesce(full_name, email) into v_name from public.profiles where id = auth.uid();
  perform public.doc_log(d, 'sent', v_name, null);
  perform public.notify_admins(d.company_id, 'document_status',
    case d.kind when 'estimate' then 'Sąmata išsiųsta' else 'Sutartis išsiųsta' end,
    d.number || ' · ' || d.client_name || ' · ' || to_char(d.total_gross, 'FM999999990.00') || ' €',
    jsonb_build_object('document_id', d.id, 'status', 'sent'), auth.uid());
  return d.public_token;
end $$;

create function public.cancel_document(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare d public.documents; v_name text;
begin
  select * into d from public.documents where id = p_id;
  perform public.doc_guard(d.company_id);
  if d.status <> 'sent' then raise exception 'Atšaukti galima tik išsiųstą dokumentą.'; end if;
  update public.documents set status = 'cancelled' where id = p_id returning * into d;
  select coalesce(full_name, email) into v_name from public.profiles where id = auth.uid();
  perform public.doc_log(d, 'cancelled', v_name, null);
  perform public.notify_admins(d.company_id, 'document_status',
    case d.kind when 'estimate' then 'Sąmata atšaukta' else 'Sutartis atšaukta' end,
    d.number || ' · ' || d.client_name, jsonb_build_object('document_id', d.id, 'status', 'cancelled'), auth.uid());
end $$;

create function public.delete_document(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare d public.documents;
begin
  select * into d from public.documents where id = p_id;
  perform public.doc_guard(d.company_id);
  if d.status not in ('draft', 'cancelled', 'declined') then raise exception 'Šio dokumento ištrinti negalima.'; end if;
  delete from public.documents where id = p_id;
end $$;

create function public.duplicate_document(p_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare d public.documents; v_id uuid;
begin
  select * into d from public.documents where id = p_id;
  perform public.doc_guard(d.company_id);
  insert into public.documents (company_id, project_id, estimate_id, kind, title, client_name, client_email, client_phone, client_address,
                                work_address, vat_rate, valid_until, notes, body, total_net, total_vat, total_gross, created_by)
  values (d.company_id, d.project_id, d.estimate_id, d.kind, d.title, d.client_name, d.client_email, d.client_phone, d.client_address,
          d.work_address, d.vat_rate, null, d.notes, d.body, d.total_net, d.total_vat, d.total_gross, auth.uid())
  returning id into v_id;
  insert into public.document_items (company_id, document_id, position, description, quantity, unit, unit_price)
  select company_id, v_id, position, description, quantity, unit, unit_price from public.document_items where document_id = p_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------- viešas atsakymas (kviečia tik serveris)
create function public.document_respond(p_token text, p_decision text, p_name text, p_note text, p_ip text) returns text
language plpgsql security definer set search_path = public as $$
declare d public.documents; v_label text;
begin
  if p_decision not in ('approved', 'declined') then raise exception 'Neteisingas sprendimas.'; end if;
  select * into d from public.documents where public_token = p_token for update;
  if not found then raise exception 'Nuoroda negalioja.'; end if;
  if d.status = 'approved' or d.status = 'declined' then raise exception 'Į šį dokumentą jau atsakyta.'; end if;
  if d.status <> 'sent' then raise exception 'Šio dokumento patvirtinti nebegalima.'; end if;
  if d.valid_until is not null and d.valid_until < public.vilnius_date(now()) then raise exception 'Pasiūlymo galiojimas pasibaigęs.'; end if;
  if p_decision = 'approved' and char_length(btrim(coalesce(p_name, ''))) < 3 then raise exception 'Įrašykite savo vardą ir pavardę.'; end if;

  update public.documents set status = p_decision, responded_at = now(), responded_name = nullif(btrim(p_name), ''),
         response_note = nullif(btrim(p_note), ''), responded_ip = nullif(left(p_ip, 80), '') where id = d.id returning * into d;
  perform public.doc_log(d, p_decision, coalesce(nullif(btrim(p_name), ''), d.client_name), nullif(btrim(p_note), ''));
  v_label := case d.kind when 'estimate' then 'Sąmata' else 'Sutartis' end;
  perform public.notify_admins(d.company_id, 'document_status',
    case p_decision when 'approved' then 'Klientas patvirtino: ' || lower(v_label) else 'Klientas atmetė: ' || lower(v_label) end,
    d.number || ' · ' || d.client_name || ' · ' || to_char(d.total_gross, 'FM999999990.00') || ' €'
      || coalesce(E'\n' || nullif(btrim(p_note), ''), ''),
    jsonb_build_object('document_id', d.id, 'status', p_decision));
  return d.number;
end $$;

-- ---------------------------------------------------------------- teisės
revoke execute on function public.next_document_number(uuid, text), public.doc_guard(uuid), public.doc_log(public.documents, text, text, text),
  public.document_respond(text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.save_company_profile(uuid, jsonb), public.save_document(uuid, jsonb, jsonb), public.send_document(uuid, text),
  public.cancel_document(uuid), public.delete_document(uuid), public.duplicate_document(uuid) from public, anon;
grant execute on function public.save_company_profile(uuid, jsonb), public.save_document(uuid, jsonb, jsonb), public.send_document(uuid, text),
  public.cancel_document(uuid), public.delete_document(uuid), public.duplicate_document(uuid) to authenticated;
grant execute on function public.document_respond(text, text, text, text, text) to service_role;
