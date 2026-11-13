-- DarboRitmas · 0015 · Automobiliai: kortelė, terminai, kilometražas, priskyrimo istorija, priminimai
-- Taisyklės: administratorius (owner/admin) tvarko visus įmonės automobilius; vairuotojas mato tik jam priskirtą.
-- Kilometražą vairuotojas įveda tik per log_car_km() (serveris tikrina, kad rodmuo nemažėtų).
-- Priminimus į notification_outbox deda car_reminders_run() (kviečia serveris su service_role).

-- ---------------------------------------------------------------- lentelės
create table public.cars (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete cascade,
  name             text not null check (char_length(btrim(name)) between 1 and 120),
  plate            text not null check (char_length(btrim(plate)) between 1 and 20),
  vin              text check (char_length(vin) <= 30),
  driver_id        uuid,
  active           boolean not null default true,           -- false = laikinai nenaudojamas (pvz. sugedo)
  needs_km         boolean not null default false,          -- reikia naujo rodmens (pakeistas vairuotojas / vėl aktyvus)
  km               integer not null default 0 check (km >= 0),
  km_date          date,                                    -- paskutinio rodmens data (Lietuvos diena)
  oil_last_km      integer not null default 0 check (oil_last_km >= 0),
  oil_interval_km  integer not null default 10000 check (oil_interval_km > 0),
  oil_warn_km      integer not null default 1000 check (oil_warn_km >= 0),
  reminder_days    smallint not null default 14 check (reminder_days in (7, 14, 21)),
  inspection_until date,                                    -- techninė apžiūra
  road_tax_until   date,                                    -- kelių mokestis
  insurance_until  date,                                    -- draudimas
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (id, company_id),
  foreign key (company_id, driver_id) references public.company_members (company_id, user_id) on delete set null (driver_id)
);
create unique index cars_company_plate_uq on public.cars (company_id, upper(btrim(plate)));
create index cars_company_idx on public.cars (company_id);
create index cars_driver_idx on public.cars (driver_id) where driver_id is not null;
create trigger cars_updated before update on public.cars for each row execute function public.set_updated_at();

create table public.car_assignments (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  car_id     uuid not null,
  driver_id  uuid references public.profiles (id) on delete set null,
  from_date  date not null default public.vilnius_date(now()),
  to_date    date,
  foreign key (car_id, company_id) references public.cars (id, company_id) on delete cascade
);
create index car_assignments_car_idx on public.car_assignments (car_id, from_date desc);

create table public.car_odometer_logs (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  car_id     uuid not null,
  km         integer not null check (km >= 0),
  logged_by  uuid references public.profiles (id) on delete set null,
  logged_at  timestamptz not null default now(),
  foreign key (car_id, company_id) references public.cars (id, company_id) on delete cascade
);
create index car_odometer_logs_car_idx on public.car_odometer_logs (car_id, logged_at desc);

-- Išsiųstų priminimų žurnalas: unikalus raktas neleidžia to paties priminimo siųsti du kartus.
create table public.car_reminder_log (
  car_id     uuid not null references public.cars (id) on delete cascade,
  key        text not null,
  created_at timestamptz not null default now(),
  primary key (car_id, key)
);

-- ---------------------------------------------------------------- triggeriai
create function public.cars_before() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.km_date := case when new.km > 0 then public.vilnius_date(now()) else null end;
    new.needs_km := false;
    return new;
  end if;

  if new.km < old.km then
    raise exception 'Rodmuo negali būti mažesnis nei % km', old.km;
  end if;

  if new.driver_id is distinct from old.driver_id then
    update public.car_assignments set to_date = public.vilnius_date(now())
     where car_id = new.id and to_date is null;
    if new.driver_id is not null then
      insert into public.car_assignments (company_id, car_id, driver_id) values (new.company_id, new.id, new.driver_id);
    end if;
    new.needs_km := true;
  end if;

  if new.active and not old.active then
    new.needs_km := true;
  end if;
  return new;
end $$;
create trigger cars_before_ins before insert on public.cars for each row execute function public.cars_before();
create trigger cars_before_upd before update on public.cars for each row execute function public.cars_before();

create function public.cars_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.driver_id is not null then
    insert into public.car_assignments (company_id, car_id, driver_id) values (new.company_id, new.id, new.driver_id);
  end if;
  if new.km > 0 then
    insert into public.car_odometer_logs (company_id, car_id, km, logged_by) values (new.company_id, new.id, new.km, auth.uid());
  end if;
  return null;
end $$;
create trigger cars_after_ins after insert on public.cars for each row execute function public.cars_after_insert();

-- ---------------------------------------------------------------- RLS ir teisės
alter table public.cars              enable row level security;
alter table public.car_assignments   enable row level security;
alter table public.car_odometer_logs enable row level security;
alter table public.car_reminder_log  enable row level security;   -- be politikų: tik service_role

create policy cars_select on public.cars for select to authenticated
  using (public.is_company_admin(company_id) or (driver_id = auth.uid() and public.is_company_member(company_id)));
create policy cars_insert on public.cars for insert to authenticated
  with check (public.is_company_admin(company_id) and public.company_has_access(company_id));
create policy cars_update on public.cars for update to authenticated
  using (public.is_company_admin(company_id))
  with check (public.is_company_admin(company_id) and public.company_has_access(company_id));
create policy cars_delete on public.cars for delete to authenticated
  using (public.is_company_admin(company_id) and public.company_has_access(company_id));

create policy car_assignments_select on public.car_assignments for select to authenticated
  using (public.is_company_admin(company_id) or (driver_id = auth.uid() and public.is_company_member(company_id)));
create policy car_logs_select on public.car_odometer_logs for select to authenticated
  using (public.is_company_admin(company_id) or (logged_by = auth.uid() and public.is_company_member(company_id)));

revoke all on public.cars, public.car_assignments, public.car_odometer_logs, public.car_reminder_log from anon, authenticated;
grant select, delete on public.cars to authenticated;
-- km, km_date ir needs_km keičiami tik per log_car_km() ir triggerius.
grant insert (company_id, name, plate, vin, driver_id, active, km, oil_last_km, oil_interval_km, oil_warn_km,
              reminder_days, inspection_until, road_tax_until, insurance_until, created_by) on public.cars to authenticated;
grant update (name, plate, vin, driver_id, active, oil_last_km, oil_interval_km, oil_warn_km,
              reminder_days, inspection_until, road_tax_until, insurance_until) on public.cars to authenticated;
grant select on public.car_assignments, public.car_odometer_logs to authenticated;

-- ---------------------------------------------------------------- vairuotojo funkcijos
create function public.log_car_km(p_car uuid, p_km integer) returns void
language plpgsql security definer set search_path = public as $$
declare c public.cars;
begin
  select * into c from public.cars where id = p_car;
  if not found then raise exception 'Automobilis nerastas.'; end if;
  if not ((c.driver_id = auth.uid() and public.is_company_member(c.company_id)) or public.is_company_admin(c.company_id)) then
    raise exception 'Neturite teisės įvesti šio automobilio kilometražo.';
  end if;
  if not public.company_has_access(c.company_id) then raise exception 'Įmonės prieiga sustabdyta.'; end if;
  if not c.active then raise exception 'Automobilis neaktyvus.'; end if;
  if p_km is null or p_km <= 0 then raise exception 'Įveskite kilometražą.'; end if;
  if p_km < c.km then raise exception 'Rodmuo negali būti mažesnis nei % km.', c.km; end if;

  update public.cars set km = p_km, km_date = public.vilnius_date(now()), needs_km = false where id = p_car;
  insert into public.car_odometer_logs (company_id, car_id, km, logged_by) values (c.company_id, p_car, p_km, auth.uid());
end $$;

create function public.set_car_reminder_days(p_car uuid, p_days integer) returns void
language plpgsql security definer set search_path = public as $$
declare c public.cars;
begin
  select * into c from public.cars where id = p_car;
  if not found then raise exception 'Automobilis nerastas.'; end if;
  if not ((c.driver_id = auth.uid() and public.is_company_member(c.company_id)) or public.is_company_admin(c.company_id)) then
    raise exception 'Neturite teisės keisti šio priminimo.';
  end if;
  if not public.company_has_access(c.company_id) then raise exception 'Įmonės prieiga sustabdyta.'; end if;
  if p_days not in (7, 14, 21) then raise exception 'Leidžiama 7, 14 arba 21 diena.'; end if;
  update public.cars set reminder_days = p_days where id = p_car;
end $$;

revoke execute on function public.log_car_km(uuid, integer), public.set_car_reminder_days(uuid, integer) from public, anon;
grant  execute on function public.log_car_km(uuid, integer), public.set_car_reminder_days(uuid, integer) to authenticated;

-- ---------------------------------------------------------------- priminimai (kviečia serveris)
-- Įrašo priminimą į eilę vieną kartą pagal raktą. Gavėjai: vairuotojas ir (jei reikia) įmonės administratoriai.
create function public.car_notify(c public.cars, p_key text, p_event text, p_title text, p_body text, p_admins boolean)
returns boolean
language plpgsql security definer set search_path = public as $$
declare r record; n integer;
begin
  insert into public.car_reminder_log (car_id, key) values (c.id, p_key) on conflict do nothing;
  get diagnostics n = row_count;
  if n = 0 then return false; end if;
  for r in
    select distinct m.user_id from public.company_members m
     where m.company_id = c.company_id and m.status = 'active' and m.user_id is not null
       and (m.user_id = c.driver_id or (p_admins and m.role in ('owner', 'admin')))
  loop
    perform public.enqueue_notification(c.company_id, r.user_id, p_event, p_title, p_body,
      jsonb_build_object('car_id', c.id, 'plate', c.plate));
  end loop;
  return true;
end $$;

create function public.car_reminders_run() returns integer
language plpgsql security definer set search_path = public as $$
declare
  c public.cars; today date := public.vilnius_date(now()); sent integer := 0;
  d record; left_days integer; bucket integer; oil_left integer; period integer;
begin
  for c in select * from public.cars k where public.company_has_access(k.company_id) loop
    -- terminai: TA, kelių mokestis, draudimas (lieka aktyvūs ir neaktyviam automobiliui)
    for d in
      select * from (values ('inspection', 'Techninė apžiūra', c.inspection_until),
                            ('road_tax',   'Kelių mokestis',   c.road_tax_until),
                            ('insurance',  'Draudimas',        c.insurance_until)) as t(kind, lbl, due)
       where due is not null
    loop
      left_days := d.due - today;
      bucket := case when left_days < 0 then -1 when left_days <= 7 then 7 when left_days <= 14 then 14 when left_days <= 30 then 30 end;
      if bucket is not null then
        if public.car_notify(c, d.kind || ':' || d.due || ':' || bucket, 'car_deadline',
             c.name || ' (' || c.plate || '): ' || d.lbl,
             case when left_days < 0 then 'Pasibaigė prieš ' || (-left_days) || ' d.' else 'Liko ' || left_days || ' d.' end,
             true) then sent := sent + 1; end if;
      end if;
    end loop;

    if c.active then
      -- kilometražo priminimas vairuotojui
      if c.needs_km then
        if public.car_notify(c, 'kmneed:' || to_char(today, 'IYYY-IW'), 'car_km', c.name || ' (' || c.plate || ')',
             'Įveskite kilometražo rodmenį.', false) then sent := sent + 1; end if;
      elsif c.km_date is null or today - c.km_date >= c.reminder_days then
        period := case when c.km_date is null then 0 else (today - c.km_date) / c.reminder_days end;
        if public.car_notify(c, 'km:' || coalesce(c.km_date::text, 'none') || ':' || period, 'car_km',
             c.name || ' (' || c.plate || ')', 'Laikas įvesti kilometražą.', false) then sent := sent + 1; end if;
      end if;

      -- tepalai: įspėjimas vairuotojui ir administratoriams
      oil_left := c.oil_last_km + c.oil_interval_km - c.km;
      if oil_left <= c.oil_warn_km then
        if public.car_notify(c, 'oil:' || c.oil_last_km || ':' || case when oil_left < 0 then 'over' else 'warn' end, 'car_oil',
             c.name || ' (' || c.plate || '): tepalai',
             case when oil_left < 0 then 'Tepalų keitimas pavėluotas ' || (-oil_left) || ' km.' else 'Iki tepalų keitimo liko ' || oil_left || ' km.' end,
             true) then sent := sent + 1; end if;
      end if;
    end if;
  end loop;
  return sent;
end $$;

revoke execute on function public.car_notify(public.cars, text, text, text, text, boolean), public.car_reminders_run()
  from public, anon, authenticated;
grant  execute on function public.car_notify(public.cars, text, text, text, text, boolean), public.car_reminders_run()
  to service_role;
