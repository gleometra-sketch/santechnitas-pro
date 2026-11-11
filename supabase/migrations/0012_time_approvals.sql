-- DarboRitmas · 0012 · Mėnesio valandų patvirtinimas (užrakinimas)
-- Administratorius patvirtina darbuotojo praėjusio mėnesio valandas. Patvirtintą mėnesį tos darbuotojos laiko įrašų
-- ir pertraukų keisti, pridėti ar trinti negalima (net administratoriui), kol patvirtinimas neatšauktas.
-- Patvirtinimo metu išsaugoma ataskaitos „nuotrauka“ (snapshot): valandos, įkainis ir suma, todėl vėlesni įkainių
-- pakeitimai patvirtinto mėnesio sumų nekeičia.

create table public.time_approvals (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null,
  user_id     uuid not null,
  month       date not null check (extract(day from month) = 1),
  minutes     integer not null check (minutes >= 0),
  snapshot    jsonb not null default '{}'::jsonb,
  approved_by uuid default auth.uid(),
  approved_at timestamptz not null default now(),
  unique (company_id, user_id, month),
  foreign key (company_id, user_id) references public.company_members (company_id, user_id) on delete cascade
);

alter table public.time_approvals enable row level security;

-- Snapshot gali turėti įkainius, todėl lentelę mato tik administratorius; darbuotojas gauna tik mėnesių sąrašą per approved_months().
create policy approvals_select on public.time_approvals for select to authenticated
  using (public.is_company_admin(company_id));
create policy approvals_insert on public.time_approvals for insert to authenticated
  with check (public.is_company_admin(company_id) and public.company_has_access(company_id));
create policy approvals_delete on public.time_approvals for delete to authenticated
  using (public.is_company_admin(company_id) and public.company_has_access(company_id));

grant select, insert, delete on public.time_approvals to authenticated;

create function public.is_month_approved(cid uuid, uid uuid, d date) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.time_approvals a
    where a.company_id = cid and a.user_id = uid and a.month = d - (extract(day from d)::int - 1)
  )
$$;

create function public.approved_months(cid uuid) returns table (month date, approved_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.month, a.approved_at from public.time_approvals a
  where a.company_id = cid and a.user_id = auth.uid() and public.is_company_member(cid)
$$;

revoke execute on function public.is_month_approved(uuid, uuid, date), public.approved_months(uuid) from public, anon;
grant  execute on function public.is_month_approved(uuid, uuid, date), public.approved_months(uuid) to authenticated;

-- Patvirtinimo tikrinimas: tik pasibaigęs mėnuo, be neuždarytų įrašų, o valandos turi sutapti su faktinėmis.
create function public.time_approvals_check() returns trigger
language plpgsql as $$
declare
  last_day date := ((new.month + interval '1 month')::date - 1);
  today    date := public.vilnius_date(now());
  actual   integer;
begin
  if new.month >= today - (extract(day from today)::int - 1) then
    raise exception 'Patvirtinti galima tik pasibaigusį mėnesį.';
  end if;
  if exists (select 1 from public.time_entries e
             where e.company_id = new.company_id and e.user_id = new.user_id and e.ended_at is null
               and public.vilnius_date(e.started_at) between new.month and last_day) then
    raise exception 'Yra neuždarytų darbo laiko įrašų. Pirmiausia juos užbaikite.';
  end if;
  select coalesce(sum(worked_minutes), 0)::int into actual from public.time_entry_summary
   where company_id = new.company_id and user_id = new.user_id and work_date between new.month and last_day;
  if actual <> new.minutes then
    raise exception 'Valandos pasikeitė. Perkraukite puslapį ir bandykite dar kartą.';
  end if;
  return new;
end $$;

create trigger time_approvals_check before insert on public.time_approvals
  for each row execute function public.time_approvals_check();

-- Užrakinimas: patvirtinto mėnesio įrašų keisti negalima (taikoma tiesioginėms `authenticated` užklausoms).
create function public.time_entries_lock() returns trigger
language plpgsql as $$
begin
  if current_user <> 'authenticated' then return coalesce(new, old); end if;
  if tg_op in ('UPDATE', 'DELETE') and public.is_month_approved(old.company_id, old.user_id, public.vilnius_date(old.started_at)) then
    raise exception 'Šis mėnuo patvirtintas, laiko įrašų keisti negalima. Pirmiausia atšaukite patvirtinimą.';
  end if;
  if tg_op in ('INSERT', 'UPDATE') and public.is_month_approved(new.company_id, new.user_id, public.vilnius_date(new.started_at)) then
    raise exception 'Šis mėnuo patvirtintas, laiko įrašų keisti negalima. Pirmiausia atšaukite patvirtinimą.';
  end if;
  return coalesce(new, old);
end $$;

create trigger time_entries_lock before insert or update or delete on public.time_entries
  for each row execute function public.time_entries_lock();

create function public.breaks_lock() returns trigger
language plpgsql as $$
declare e public.time_entries;
begin
  if current_user <> 'authenticated' then return coalesce(new, old); end if;
  select * into e from public.time_entries where id = coalesce(new.time_entry_id, old.time_entry_id);
  if found and public.is_month_approved(e.company_id, e.user_id, public.vilnius_date(e.started_at)) then
    raise exception 'Šis mėnuo patvirtintas, pertraukų keisti negalima. Pirmiausia atšaukite patvirtinimą.';
  end if;
  return coalesce(new, old);
end $$;

create trigger breaks_lock before insert or update or delete on public.breaks
  for each row execute function public.breaks_lock();
