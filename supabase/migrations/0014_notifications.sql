-- DarboRitmas · 0014 · Pranešimai: kanalai, nustatymai, programos pranešimai, siuntimo eilė
-- Pranešimai kuriami duomenų bazėje (triggeriai) į eilę `notification_outbox`; juos kanalais išsiunčia serveris
-- (service_role), nes darbus, medžiagas ir kt. šiuo metu keičia tiesiogiai naršyklė per Supabase.

-- ---------------------------------------------------------------- lentelės
-- Prijungti kanalai (Telegram chat_id, el. paštas, push). Rašo tik serveris.
create table public.notification_channels (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  channel    text not null check (channel in ('push', 'telegram', 'email', 'sms')),
  address    jsonb not null default '{}'::jsonb,
  verified   boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, channel)
);

-- Naudotojo pasirinkimai: kuris įvykis kuriuo kanalu. Nėra eilutės = galioja numatytoji reikšmė (src/lib/notifications/events.ts).
create table public.notification_preferences (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  event_type text not null check (char_length(event_type) <= 60),
  channel    text not null check (channel in ('inapp', 'push', 'telegram', 'email', 'sms')),
  enabled    boolean not null,
  primary key (user_id, event_type, channel)
);

create table public.notification_settings (
  user_id          uuid primary key references public.profiles (id) on delete cascade,
  quiet_start      time,
  quiet_end        time,
  timezone         text not null default 'Europe/Vilnius',
  fallback_channel text check (fallback_channel in ('push', 'telegram', 'email', 'sms'))
);

-- Programos pranešimai (varpelis). Pririšti prie įmonės, kad keli darbdaviai nesusimaišytų.
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  user_id    uuid not null,
  event_type text not null,
  title      text not null check (char_length(title) <= 200),
  body       text not null default '' check (char_length(body) <= 1000),
  data       jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now(),
  foreign key (company_id, user_id) references public.company_members (company_id, user_id) on delete cascade
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- Siuntimo žurnalas (ką ir kuriuo kanalu bandyta siųsti). Skaito tik serveris.
create table public.notification_log (
  id         bigint generated always as identity primary key,
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  event_type text not null,
  channel    text not null,
  status     text not null check (status in ('sent', 'failed', 'skipped', 'deferred')),
  detail     text,
  created_at timestamptz not null default now()
);
create index notification_log_company_idx on public.notification_log (company_id, created_at desc);

-- Eilė: triggeriai čia deda įvykius, serveris juos paima ir išsiunčia.
create table public.notification_outbox (
  id           bigint generated always as identity primary key,
  company_id   uuid not null references public.companies (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  event_type   text not null,
  title        text not null,
  body         text not null default '',
  data         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  processed_at timestamptz,
  attempts     integer not null default 0,
  claimed_at   timestamptz,
  last_error   text
);
create index notification_outbox_pending_idx on public.notification_outbox (id) where processed_at is null;

-- ---------------------------------------------------------------- RLS ir teisės
alter table public.notification_channels    enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_settings    enable row level security;
alter table public.notifications            enable row level security;
alter table public.notification_log         enable row level security;   -- be politikų: tik service_role
alter table public.notification_outbox      enable row level security;   -- be politikų: tik service_role

-- Kanalus (pvz. Telegram chat_id) keičia tik serveris, kad niekas negalėtų užsirašyti svetimo ID.
create policy nchannels_select on public.notification_channels for select to authenticated
  using (user_id = auth.uid());

create policy nprefs_select on public.notification_preferences for select to authenticated
  using (user_id = auth.uid());
create policy nprefs_insert on public.notification_preferences for insert to authenticated
  with check (user_id = auth.uid());
create policy nprefs_update on public.notification_preferences for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy nprefs_delete on public.notification_preferences for delete to authenticated
  using (user_id = auth.uid());

create policy nsettings_select on public.notification_settings for select to authenticated
  using (user_id = auth.uid());
create policy nsettings_insert on public.notification_settings for insert to authenticated
  with check (user_id = auth.uid());
create policy nsettings_update on public.notification_settings for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Programos pranešimus kuria serveris; naudotojas gali tik skaityti, pažymėti skaitytais ir ištrinti savo.
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = auth.uid());

revoke all on public.notification_channels, public.notification_preferences, public.notification_settings,
              public.notifications, public.notification_log, public.notification_outbox from anon, authenticated;
grant select on public.notification_channels to authenticated;
grant select, insert, update, delete on public.notification_preferences to authenticated;
-- upsert (insert ... on conflict do update) atnaujina ir user_id stulpelį, todėl update teisė visai lentelei; RLS riboja iki savo eilutės.
grant select, insert, update on public.notification_settings to authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Realtime (varpeliui). Supabase turi šią publikaciją; švari testų PostgreSQL – ne.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- ---------------------------------------------------------------- eilės funkcijos (tik serveriui)
create function public.enqueue_notification(
  p_company uuid, p_user uuid, p_event text, p_title text, p_body text, p_data jsonb default '{}'::jsonb
) returns void
language sql security definer set search_path = public as $$
  insert into public.notification_outbox (company_id, user_id, event_type, title, body, data)
  select p_company, p_user, p_event, left(p_title, 200), left(coalesce(p_body, ''), 1000), coalesce(p_data, '{}'::jsonb)
   where exists (select 1 from public.company_members m
                  where m.company_id = p_company and m.user_id = p_user and m.status = 'active')
$$;

-- Paima neišsiųstus įvykius (SKIP LOCKED: du vienu metu veikiantys procesai nesidubliuoja).
-- Įvykis bandomas ne daugiau kaip 5 kartus; "užstrigęs" (paimtas, bet neužbaigtas) grąžinamas po 5 min.
create function public.claim_notification_outbox(p_limit integer default 50)
returns setof public.notification_outbox
language sql security definer set search_path = public as $$
  update public.notification_outbox o
     set attempts = o.attempts + 1, claimed_at = now()
   where o.id in (
     select q.id from public.notification_outbox q
      where q.processed_at is null and q.attempts < 5
        and (q.claimed_at is null or q.claimed_at < now() - interval '5 minutes')
      order by q.id
      limit greatest(1, least(coalesce(p_limit, 50), 200))
      for update skip locked)
  returning o.*
$$;

revoke execute on function public.enqueue_notification(uuid, uuid, text, text, text, jsonb),
                           public.claim_notification_outbox(integer) from public, anon, authenticated;
grant  execute on function public.enqueue_notification(uuid, uuid, text, text, text, jsonb),
                           public.claim_notification_outbox(integer) to service_role;

-- ---------------------------------------------------------------- įvykių šaltiniai (triggeriai)
-- 1) Darbas priskirtas darbuotojui (naujas arba pakeistas vykdytojas). Sau paties nepranešama.
create function public.tasks_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_project text;
begin
  if new.assigned_to is null then return null; end if;
  if tg_op = 'UPDATE' and new.assigned_to is not distinct from old.assigned_to then return null; end if;
  if new.assigned_to is not distinct from auth.uid() then return null; end if;

  select p.name into v_project from public.projects p
   where p.id = new.project_id and p.company_id = new.company_id;
  perform public.enqueue_notification(
    new.company_id, new.assigned_to, 'task_assigned', 'Nauja užduotis',
    new.title || coalesce(' – ' || v_project, ''),
    jsonb_build_object('task_id', new.id, 'project_id', new.project_id, 'scheduled_date', new.scheduled_date));
  return null;
end $$;
create trigger tasks_notify after insert or update of assigned_to on public.tasks
  for each row execute function public.tasks_notify();

-- 2) Naujas medžiagų prašymas: pranešama įmonės administratoriams (ne pačiam autoriui).
create function public.material_request_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  select coalesce(p.full_name, p.email) into v_name from public.profiles p where p.id = new.employee_id;
  insert into public.notification_outbox (company_id, user_id, event_type, title, body, data)
  select new.company_id, m.user_id, 'material_request', 'Naujas medžiagų prašymas',
         left(coalesce(v_name, 'Darbuotojas') || ' pateikė medžiagų prašymą', 1000),
         jsonb_build_object('request_id', new.id, 'project_id', new.project_id)
    from public.company_members m
   where m.company_id = new.company_id and m.status = 'active' and m.role in ('owner', 'admin')
     and m.user_id is distinct from new.employee_id;
  return null;
end $$;
create trigger material_request_notify after insert on public.material_requests
  for each row execute function public.material_request_notify();

-- 3) Mėnesio valandos patvirtintos: pranešama darbuotojui.
create function public.time_approvals_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is distinct from auth.uid() then
    perform public.enqueue_notification(
      new.company_id, new.user_id, 'hours_approved', 'Valandos patvirtintos',
      to_char(new.month, 'YYYY-MM') || ' mėnesio valandos patvirtintos',
      jsonb_build_object('month', new.month, 'minutes', new.minutes));
  end if;
  return null;
end $$;
create trigger time_approvals_notify after insert on public.time_approvals
  for each row execute function public.time_approvals_notify();
