-- SANTECHNITAS PRO · 0001 · Pagrindas: profiliai, įmonės, nariai, bandomojo laikotarpio apsauga
-- Vykdyti pirmą. Visos lentelės naudoja Row Level Security (RLS).

create type public.member_role   as enum ('owner', 'admin', 'worker');
create type public.member_status as enum ('invited', 'active', 'removed');

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------- lentelės
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null check (email = lower(email)),
  full_name  text check (char_length(full_name) <= 120),
  phone      text check (char_length(phone) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.companies (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(btrim(name)) between 2 and 120),
  created_by    uuid not null references public.profiles (id),
  trial_ends_at timestamptz not null default now() + interval '14 days',
  -- Nemokama prieiga, kurią suteikia platformos savininkas (keičiama tik per service_role).
  complimentary boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.company_members (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id    uuid references public.profiles (id) on delete cascade,
  email      text not null check (email = lower(email)),
  role       public.member_role   not null default 'worker',
  status     public.member_status not null default 'invited',
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id),
  unique (company_id, email),
  check (status = 'invited' or user_id is not null)
);
create index company_members_user_idx on public.company_members (user_id) where status = 'active';

-- Apsauga nuo pakartotinio nemokamo bandymo: vienas bandymas vienam (normalizuotam) el. paštui.
create table public.trial_claims (
  normalized_email text primary key,
  company_id       uuid references public.companies (id) on delete set null,
  created_at       timestamptz not null default now()
);

create trigger profiles_updated  before update on public.profiles        for each row execute function public.set_updated_at();
create trigger companies_updated before update on public.companies       for each row execute function public.set_updated_at();
create trigger members_updated   before update on public.company_members for each row execute function public.set_updated_at();

-- ------------------------------------------------------ pagalbinės funkcijos
create function public.normalize_email(e text) returns text
language sql immutable as $$
  select case
    when split_part(lower(btrim(e)), '@', 2) in ('gmail.com', 'googlemail.com')
      then replace(split_part(split_part(lower(btrim(e)), '@', 1), '+', 1), '.', '') || '@gmail.com'
    else split_part(split_part(lower(btrim(e)), '@', 1), '+', 1) || '@' || split_part(lower(btrim(e)), '@', 2)
  end
$$;

create function public.vilnius_date(ts timestamptz) returns date
language sql stable as $$ select (ts at time zone 'Europe/Vilnius')::date $$;

create function public.is_company_member(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = cid and m.user_id = auth.uid() and m.status = 'active')
$$;

create function public.is_company_admin(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = cid and m.user_id = auth.uid() and m.status = 'active'
      and m.role in ('owner', 'admin'))
$$;

create function public.shares_company_with(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.company_members a
    join public.company_members b on b.company_id = a.company_id
    where a.user_id = auth.uid() and a.status = 'active'
      and b.user_id = uid       and b.status = 'active')
$$;

create function public.company_active_seats(cid uuid) returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.company_members m where m.company_id = cid and m.status = 'active'
$$;

-- ---------------------------------------------------------------- RPC
-- Įmonės kūrimas: sukuria įmonę, priskiria savininką ir pritaiko 14 dienų bandymą (tik pirmą kartą).
create function public.create_company(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid    uuid := auth.uid();
  v_mail text;
  v_id   uuid;
  v_rows integer;
begin
  if uid is null then
    raise exception 'Reikia prisijungti' using errcode = '28000';
  end if;
  if p_name is null or char_length(btrim(p_name)) < 2 then
    raise exception 'Įmonės pavadinimas per trumpas' using errcode = '22023';
  end if;
  select email into v_mail from public.profiles where id = uid;

  insert into public.companies (name, created_by) values (btrim(p_name), uid) returning id into v_id;
  insert into public.company_members (company_id, user_id, email, role, status)
    values (v_id, uid, v_mail, 'owner', 'active');

  insert into public.trial_claims (normalized_email, company_id)
    values (public.normalize_email(v_mail), v_id) on conflict do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then  -- bandymas jau buvo panaudotas
    update public.companies set trial_ends_at = now() where id = v_id;
  end if;
  return v_id;
end $$;

-- Pakvietimų priėmimas: kviečiamas po prisijungimo. Reikalauja patvirtinto el. pašto.
create function public.claim_invitations() returns integer
language plpgsql security definer set search_path = public as $$
declare
  uid    uuid := auth.uid();
  v_mail text;
  v_rows integer;
begin
  if uid is null then return 0; end if;
  select lower(u.email) into v_mail from auth.users u
    where u.id = uid and u.email_confirmed_at is not null;
  if v_mail is null then return 0; end if;

  update public.company_members
     set user_id = uid, status = 'active'
   where status = 'invited' and email = v_mail and user_id is null;
  get diagnostics v_rows = row_count;
  return v_rows;
end $$;

-- Profilio sukūrimas po registracijos.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, lower(new.email), nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Narių apsauga: savininko neįmanoma pašalinti ar pažeminti, niekas nekeičia savo vaidmens.
create function public.guard_member_changes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.role = 'owner' then
      raise exception 'Savininko pašalinti negalima' using errcode = '42501';
    end if;
    return old;
  end if;

  if new.company_id <> old.company_id then
    raise exception 'Negalima perkelti nario į kitą įmonę' using errcode = '42501';
  end if;
  if old.user_id is not null and new.user_id is distinct from old.user_id then
    raise exception 'Negalima keisti nario paskyros' using errcode = '42501';
  end if;
  if old.role = 'owner' and (new.role <> 'owner' or new.status <> 'active') then
    raise exception 'Savininko pakeisti negalima' using errcode = '42501';
  end if;
  if new.role = 'owner' and old.role <> 'owner' then
    raise exception 'Savininku tapti negalima' using errcode = '42501';
  end if;
  if auth.uid() is not null and old.user_id = auth.uid() and new.role <> old.role then
    raise exception 'Savo vaidmens keisti negalima' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger members_guard before update or delete on public.company_members
  for each row execute function public.guard_member_changes();

-- ---------------------------------------------------------------- RLS
alter table public.profiles        enable row level security;
alter table public.companies       enable row level security;
alter table public.company_members enable row level security;
alter table public.trial_claims    enable row level security;   -- be politikų: tik service_role

create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_company_with(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy companies_select on public.companies for select to authenticated
  using (public.is_company_member(id));
create policy companies_update on public.companies for update to authenticated
  using (public.is_company_admin(id)) with check (public.is_company_admin(id));

create policy members_select on public.company_members for select to authenticated
  using (public.is_company_member(company_id));
create policy members_insert on public.company_members for insert to authenticated
  with check (public.is_company_admin(company_id)
              and role in ('admin', 'worker') and status = 'invited' and user_id is null);
create policy members_update on public.company_members for update to authenticated
  using (public.is_company_admin(company_id))
  with check (public.is_company_admin(company_id) and role in ('owner', 'admin', 'worker'));
create policy members_delete on public.company_members for delete to authenticated
  using (public.is_company_admin(company_id) and status = 'invited');

-- Stulpelių teisės: bandymo pabaigos ir nemokamos prieigos klientas keisti negali.
revoke all on public.profiles, public.companies, public.company_members, public.trial_claims from anon, authenticated;
grant select on public.profiles, public.companies, public.company_members to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
grant update (name) on public.companies to authenticated;
grant insert (company_id, email, role, status, invited_by) on public.company_members to authenticated;
grant update (role, status) on public.company_members to authenticated;
grant delete on public.company_members to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.is_company_member(uuid), public.is_company_admin(uuid),
  public.shares_company_with(uuid), public.company_active_seats(uuid), public.vilnius_date(timestamptz),
  public.create_company(text), public.claim_invitations() to authenticated;
