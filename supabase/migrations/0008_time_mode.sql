-- SANTECHNITAS PRO / DarboRitmas · 0008 · Laiko apskaitos režimas: tik valandos arba valandos pagal objektą
-- Vadovas pasirenka įmonės numatytąjį režimą ir gali bet kada pakeisti; kiekvienam darbuotojui galima nustatyti atskirai
-- (NULL = pagal įmonės nustatymą). Laikas prie objekto saugomas time_entries.project_id (stulpelis jau egzistavo).

alter table public.companies       add column time_mode text not null default 'hours' check (time_mode in ('hours', 'project'));
alter table public.company_members add column time_mode text check (time_mode in ('hours', 'project'));

-- Keisti gali tik administratorius (RLS politikos companies_update / members_update jau reikalauja administratoriaus).
grant update (name, time_mode)         on public.companies       to authenticated;
grant update (role, status, time_mode) on public.company_members to authenticated;

-- Galiojantis režimas prisijungusiam naudotojui: darbuotojo nustatymas, kitaip įmonės.
create function public.effective_time_mode(cid uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(m.time_mode, c.time_mode)
  from public.companies c
  join public.company_members m on m.company_id = c.id and m.user_id = auth.uid() and m.status = 'active'
  where c.id = cid
$$;

-- Darbuotojas objektus (kitaip jis mato tik savo darbų objektus) gali pasirinkti laikui žymėti:
-- grąžinami tik aktyvių objektų id, pavadinimas ir adresas (be pastabų ir užsakymo nr.).
create function public.time_project_options(cid uuid) returns table (id uuid, name text, address text)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.address
  from public.projects p
  where p.company_id = cid and p.status = 'active' and public.is_company_member(cid)
  order by p.name
$$;

-- Perjungia einamąjį darbą į kitą objektą: užbaigia dabartinį įrašą ir iškart pradeda naują (viena transakcija).
create function public.switch_time_project(p_project uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  e public.time_entries;
  nid uuid;
  ts timestamptz := now();
begin
  select * into e from public.time_entries where user_id = auth.uid() and ended_at is null;
  if not found then raise exception 'Darbas nepradėtas.'; end if;
  if not public.is_company_member(e.company_id) or not public.company_has_access(e.company_id) then
    raise exception 'Neturite teisės.' using errcode = '42501';
  end if;
  if public.effective_time_mode(e.company_id) <> 'project' then
    raise exception 'Šiam darbuotojui objekto pasirinkimas išjungtas.';
  end if;
  if exists (select 1 from public.breaks b where b.time_entry_id = e.id and b.ended_at is null) then
    raise exception 'Pirmiausia baikite pertrauką.';
  end if;
  if not exists (select 1 from public.projects p where p.id = p_project and p.company_id = e.company_id and p.status = 'active') then
    raise exception 'Objektas nerastas arba archyvuotas.';
  end if;
  if e.project_id is not distinct from p_project then return e.id; end if;
  if ts <= e.started_at then
    update public.time_entries set project_id = p_project where id = e.id;
    return e.id;
  end if;
  update public.time_entries set ended_at = ts where id = e.id;
  insert into public.time_entries (company_id, user_id, project_id, started_at)
    values (e.company_id, e.user_id, p_project, ts) returning id into nid;
  return nid;
end $$;

revoke execute on function public.effective_time_mode(uuid), public.time_project_options(uuid), public.switch_time_project(uuid) from public, anon;
grant  execute on function public.effective_time_mode(uuid), public.time_project_options(uuid), public.switch_time_project(uuid) to authenticated;
