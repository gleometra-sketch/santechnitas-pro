-- DarboRitmas · 0016 · Sąmatos: skaičiuoklė ir medžiagų / darbų katalogas
-- Visas lenteles mato ir keičia tik įmonės administratorius (kainos darbuotojams nerodomos).
-- Katalogas „mokosi“ iš sąmatų: išsaugant sąmatą kiekviena pozicija su kaina įrašoma arba atnaujinama kataloge,
-- o kitą kartą ją galima pasirinkti pradėjus rašyti pavadinimą. Kiekiai (m, kg, vnt.) kaskart įvedami iš naujo.

-- ---------------------------------------------------------------- lentelės
-- Sąmatų numeracija: 2026-001, 2026-002... atskirai kiekvienai įmonei ir metams. Rašo tik triggeris (be politikų).
create table public.estimate_counters (
  company_id  uuid not null references public.companies (id) on delete cascade,
  year        integer not null,
  last_number integer not null default 0,
  primary key (company_id, year)
);

create table public.estimates (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete cascade,
  number           text not null,
  title            text not null default '' check (char_length(title) <= 200),
  project_id       uuid,
  client_name      text check (char_length(client_name) <= 160),
  client_phone     text check (char_length(client_phone) <= 40),
  client_email     text check (char_length(client_email) <= 200),
  address          text check (char_length(address) <= 300),
  status           text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected')),
  vat_percent      numeric(5, 2) not null default 21 check (vat_percent between 0 and 100),
  discount_percent numeric(5, 2) not null default 0 check (discount_percent between 0 and 100),
  valid_until      date,
  notes            text check (char_length(notes) <= 4000),
  created_by       uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (id, company_id),
  unique (company_id, number),
  foreign key (project_id, company_id) references public.projects (id, company_id) on delete set null (project_id)
);
create index estimates_company_idx on public.estimates (company_id, created_at desc);

-- Sąmatos eilutės. Suma = kiekis × vieneto kaina, apvalinama iki cento (skaičiuojama, o ne saugoma).
create table public.estimate_lines (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null,
  estimate_id      uuid not null,
  position         integer not null check (position >= 0),
  kind             text not null check (kind in ('material', 'work', 'other')),
  name             text not null check (char_length(btrim(name)) between 1 and 200),
  unit             text not null default 'vnt.' check (char_length(btrim(unit)) between 1 and 20),
  quantity         numeric(12, 3) not null check (quantity >= 0 and quantity <= 100000),
  unit_price_cents integer not null check (unit_price_cents between 0 and 100000000),
  created_at       timestamptz not null default now(),
  foreign key (estimate_id, company_id) references public.estimates (id, company_id) on delete cascade
);
create index estimate_lines_estimate_idx on public.estimate_lines (estimate_id, position);

-- Katalogas: kiekviena kada nors įvesta medžiaga / darbas su paskutiniu vienetu ir kaina.
create table public.estimate_catalog (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete cascade,
  kind             text not null check (kind in ('material', 'work', 'other')),
  name             text not null check (char_length(btrim(name)) between 1 and 200),
  name_key         text generated always as (lower(btrim(name))) stored,
  unit             text not null default 'vnt.' check (char_length(btrim(unit)) between 1 and 20),
  unit_price_cents integer not null check (unit_price_cents between 0 and 100000000),
  last_used_at     timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (company_id, kind, name_key)
);
create index estimate_catalog_recent_idx on public.estimate_catalog (company_id, last_used_at desc);

create trigger estimates_updated before update on public.estimates
  for each row execute function public.set_updated_at();
create trigger estimate_catalog_updated before update on public.estimate_catalog
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- triggeriai
create function public.estimates_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  y integer := extract(year from (now() at time zone 'Europe/Vilnius'))::integer;
  n integer;
begin
  insert into public.estimate_counters (company_id, year, last_number) values (new.company_id, y, 1)
  on conflict (company_id, year) do update set last_number = public.estimate_counters.last_number + 1
  returning last_number into n;
  new.number := y::text || '-' || lpad(n::text, 3, '0');
  return new;
end $$;
create trigger estimates_before_ins before insert on public.estimates
  for each row execute function public.estimates_before_insert();

create function public.estimates_guard() returns trigger
language plpgsql as $$
begin
  if new.company_id <> old.company_id or new.number <> old.number then
    raise exception 'Sąmatos įmonės ar numerio keisti negalima' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger estimates_guard_upd before update on public.estimates
  for each row execute function public.estimates_guard();

-- ---------------------------------------------------------------- suvestinė sąrašui
-- Tarpinė suma (be nuolaidos ir PVM) kiekvienai sąmatai; nuolaidą ir PVM pritaiko programa (src/lib/estimates/calc.ts).
create view public.estimate_subtotals with (security_invoker = true) as
select e.id as estimate_id,
       e.company_id,
       coalesce(sum(round(l.quantity * l.unit_price_cents)), 0)::bigint as subtotal_cents
from public.estimates e
left join public.estimate_lines l on l.estimate_id = e.id
group by e.id, e.company_id;

-- ---------------------------------------------------------------- RLS
alter table public.estimate_counters enable row level security;   -- be politikų: tik triggeris
alter table public.estimates         enable row level security;
alter table public.estimate_lines    enable row level security;
alter table public.estimate_catalog  enable row level security;

create policy estimates_select on public.estimates for select to authenticated
  using (public.is_company_admin(company_id));
create policy estimates_insert on public.estimates for insert to authenticated
  with check (public.is_company_admin(company_id) and public.company_has_access(company_id));
create policy estimates_update on public.estimates for update to authenticated
  using (public.is_company_admin(company_id) and public.company_has_access(company_id))
  with check (public.is_company_admin(company_id));
create policy estimates_delete on public.estimates for delete to authenticated
  using (public.is_company_admin(company_id) and public.company_has_access(company_id));

create policy estimate_lines_select on public.estimate_lines for select to authenticated
  using (public.is_company_admin(company_id));
create policy estimate_lines_insert on public.estimate_lines for insert to authenticated
  with check (public.is_company_admin(company_id) and public.company_has_access(company_id));
create policy estimate_lines_delete on public.estimate_lines for delete to authenticated
  using (public.is_company_admin(company_id) and public.company_has_access(company_id));

create policy estimate_catalog_select on public.estimate_catalog for select to authenticated
  using (public.is_company_admin(company_id));
create policy estimate_catalog_insert on public.estimate_catalog for insert to authenticated
  with check (public.is_company_admin(company_id) and public.company_has_access(company_id));
create policy estimate_catalog_update on public.estimate_catalog for update to authenticated
  using (public.is_company_admin(company_id) and public.company_has_access(company_id))
  with check (public.is_company_admin(company_id));
create policy estimate_catalog_delete on public.estimate_catalog for delete to authenticated
  using (public.is_company_admin(company_id) and public.company_has_access(company_id));

revoke all on public.estimate_counters, public.estimates, public.estimate_lines, public.estimate_catalog,
              public.estimate_subtotals from anon, authenticated;
-- Numerį ir įmonę nustato tik serveris: į insert / update teises jie neįtraukti.
grant select, delete on public.estimates to authenticated;
grant insert (company_id, title, project_id, client_name, client_phone, client_email, address, status,
              vat_percent, discount_percent, valid_until, notes) on public.estimates to authenticated;
grant update (title, project_id, client_name, client_phone, client_email, address, status,
              vat_percent, discount_percent, valid_until, notes) on public.estimates to authenticated;
grant select, insert, delete on public.estimate_lines to authenticated;
grant select, insert, update, delete on public.estimate_catalog to authenticated;
grant select on public.estimate_subtotals to authenticated;

-- ---------------------------------------------------------------- RPC
-- Išsaugo visą sąmatą viena atomine operacija: antraštę, eilutes (pakeičia visas) ir, jei p_learn, katalogą.
-- Automatinis išsaugojimas (p_learn = false) katalogo nekeičia, kad nesusikauptų pusiau įvesti pavadinimai.
-- Vykdoma skambinančiojo teisėmis (security invoker): galioja visos RLS taisyklės.
create function public.save_estimate(p_id uuid, p_header jsonb, p_lines jsonb, p_learn boolean default true)
returns void
language plpgsql security invoker set search_path = public as $$
declare
  v_company uuid;
  v_rows    integer;
begin
  if p_header is null or jsonb_typeof(p_header) <> 'object' or p_lines is null or jsonb_typeof(p_lines) <> 'array' then
    raise exception 'Neteisingi duomenys' using errcode = '22023';
  end if;
  if jsonb_array_length(p_lines) > 300 then
    raise exception 'Per daug eilučių (daugiausia 300)' using errcode = '22023';
  end if;

  select e.company_id into v_company from public.estimates e where e.id = p_id;
  if v_company is null then
    raise exception 'Sąmata nerasta';
  end if;

  update public.estimates set
    title            = coalesce(btrim(p_header ->> 'title'), ''),
    project_id       = nullif(p_header ->> 'projectId', '')::uuid,
    client_name      = nullif(btrim(p_header ->> 'clientName'), ''),
    client_phone     = nullif(btrim(p_header ->> 'clientPhone'), ''),
    client_email     = nullif(btrim(p_header ->> 'clientEmail'), ''),
    address          = nullif(btrim(p_header ->> 'address'), ''),
    status           = p_header ->> 'status',
    vat_percent      = (p_header ->> 'vatPercent')::numeric,
    discount_percent = (p_header ->> 'discountPercent')::numeric,
    valid_until      = nullif(p_header ->> 'validUntil', '')::date,
    notes            = nullif(btrim(p_header ->> 'notes'), '')
  where id = p_id;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then  -- RLS neleido keisti (pvz. pasibaigusi prieiga)
    raise exception 'Neturite teisės keisti šios sąmatos' using errcode = '42501';
  end if;

  delete from public.estimate_lines where estimate_id = p_id;
  insert into public.estimate_lines (company_id, estimate_id, position, kind, name, unit, quantity, unit_price_cents)
  select v_company, p_id, i.pos, i.kind, btrim(i.name), btrim(i.unit), i.quantity, i.price
    from jsonb_to_recordset(p_lines) as i(pos integer, kind text, name text, unit text, quantity numeric, price integer);

  if p_learn then
    -- Kiekviena pozicija su kaina įrašoma / atnaujinama kataloge (laimi paskutinė sąmatos eilutė).
    -- Eilutės be kainos neįsimenamos: nepilnai užpildyta eilutė neturi sugadinti katalogo kainos.
    insert into public.estimate_catalog (company_id, kind, name, unit, unit_price_cents, last_used_at)
    select distinct on (l.kind, lower(btrim(l.name))) l.company_id, l.kind, l.name, l.unit, l.unit_price_cents, now()
      from public.estimate_lines l
     where l.estimate_id = p_id and l.unit_price_cents > 0
     order by l.kind, lower(btrim(l.name)), l.position desc
    on conflict (company_id, kind, name_key) do update
      set name = excluded.name, unit = excluded.unit, unit_price_cents = excluded.unit_price_cents,
          last_used_at = excluded.last_used_at;
  end if;
end $$;

-- Sukuria sąmatos kopiją (juodraštį) su visomis eilutėmis: greičiausias būdas pradėti panašią sąmatą.
create function public.duplicate_estimate(p_id uuid) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_new uuid;
begin
  insert into public.estimates (company_id, title, project_id, client_name, client_phone, client_email, address,
                                status, vat_percent, discount_percent, notes)
  select e.company_id, left(btrim(e.title || ' (kopija)'), 200), e.project_id, e.client_name, e.client_phone,
         e.client_email, e.address, 'draft', e.vat_percent, e.discount_percent, e.notes
    from public.estimates e where e.id = p_id
  returning id into v_new;
  if v_new is null then
    raise exception 'Sąmata nerasta';
  end if;

  insert into public.estimate_lines (company_id, estimate_id, position, kind, name, unit, quantity, unit_price_cents)
  select l.company_id, v_new, l.position, l.kind, l.name, l.unit, l.quantity, l.unit_price_cents
    from public.estimate_lines l where l.estimate_id = p_id;
  return v_new;
end $$;

revoke execute on function public.save_estimate(uuid, jsonb, jsonb, boolean), public.duplicate_estimate(uuid)
  from public, anon;
grant execute on function public.save_estimate(uuid, jsonb, jsonb, boolean), public.duplicate_estimate(uuid)
  to authenticated;
