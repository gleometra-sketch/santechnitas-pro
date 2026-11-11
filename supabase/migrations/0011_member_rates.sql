-- DarboRitmas · 0011 · Valandiniai įkainiai (mato ir keičia tik administratorius)
-- Įkainis saugomas atskiroje lentelėje, ne `company_members`, nes narių eilutes mato visi įmonės darbuotojai.
-- Įkainiai turi istoriją: galioja nuo `effective_from`, ataskaita kiekvienai dienai ima tos dienos įkainį.

create table public.member_rates (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null,
  user_id           uuid not null,
  hourly_rate_cents integer not null check (hourly_rate_cents between 0 and 100000),
  effective_from    date not null,
  created_by        uuid default auth.uid(),
  created_at        timestamptz not null default now(),
  unique (company_id, user_id, effective_from),
  foreign key (company_id, user_id) references public.company_members (company_id, user_id) on delete cascade
);

alter table public.member_rates enable row level security;

create policy rates_select on public.member_rates for select to authenticated
  using (public.is_company_admin(company_id));
create policy rates_insert on public.member_rates for insert to authenticated
  with check (public.is_company_admin(company_id) and public.company_has_access(company_id));
create policy rates_update on public.member_rates for update to authenticated
  using (public.is_company_admin(company_id) and public.company_has_access(company_id))
  with check (public.is_company_admin(company_id));
create policy rates_delete on public.member_rates for delete to authenticated
  using (public.is_company_admin(company_id) and public.company_has_access(company_id));

grant select, insert, update, delete on public.member_rates to authenticated;
