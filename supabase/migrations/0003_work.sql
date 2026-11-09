-- SANTECHNITAS PRO · 0003 · Objektai, darbai, darbo laikas, pertraukos, pastabos, priedai
-- Taisyklės: skaityti gali įmonės nariai pagal vaidmenį; rašyti tik kai įmonė turi prieigą (bandymas/prenumerata).
-- Sudėtiniai FK (id, company_id) neleidžia susieti įrašų tarp skirtingų įmonių.

-- ---------------------------------------------------------------- objektai
create table public.projects (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 160),
  address    text check (char_length(address) <= 300),
  order_no   text check (char_length(order_no) <= 60),
  notes      text check (char_length(notes) <= 4000),
  status     text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, company_id)
);
create index projects_company_idx on public.projects (company_id, status);

-- ---------------------------------------------------------------- darbai
create table public.tasks (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies (id) on delete cascade,
  project_id     uuid,
  title          text not null check (char_length(btrim(title)) between 1 and 200),
  description    text check (char_length(description) <= 4000),
  assigned_to    uuid,
  scheduled_date date,                       -- Lietuvos kalendorinė diena
  status         text not null default 'planned' check (status in ('planned', 'in_progress', 'done')),
  completed_at   timestamptz,
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, company_id),
  foreign key (project_id, company_id) references public.projects (id, company_id) on delete cascade,
  foreign key (company_id, assigned_to) references public.company_members (company_id, user_id)
);
create index tasks_assignee_idx on public.tasks (assigned_to, scheduled_date);
create index tasks_company_date_idx on public.tasks (company_id, scheduled_date);

create table public.task_checklist_items (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  task_id    uuid not null,
  title      text not null check (char_length(btrim(title)) between 1 and 200),
  is_done    boolean not null default false,
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (task_id, company_id) references public.tasks (id, company_id) on delete cascade
);
create index checklist_task_idx on public.task_checklist_items (task_id, position);

-- ---------------------------------------------------------------- darbo laikas
create table public.time_entries (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  user_id    uuid not null,
  project_id uuid,
  started_at timestamptz not null,
  ended_at   timestamptz,
  note       text check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or ended_at > started_at),
  unique (id, company_id),
  foreign key (company_id, user_id) references public.company_members (company_id, user_id),
  foreign key (project_id, company_id) references public.projects (id, company_id) on delete set null (project_id)
);
-- Vienu metu vienas neužbaigtas įrašas vienam darbuotojui.
create unique index time_entries_one_open on public.time_entries (user_id) where ended_at is null;
create index time_entries_user_idx on public.time_entries (user_id, started_at desc);
create index time_entries_company_idx on public.time_entries (company_id, started_at desc);

create table public.breaks (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null,
  time_entry_id uuid not null,
  user_id       uuid not null,
  started_at    timestamptz not null,
  ended_at      timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (ended_at is null or ended_at > started_at),
  foreign key (time_entry_id, company_id) references public.time_entries (id, company_id) on delete cascade
);
create unique index breaks_one_open on public.breaks (time_entry_id) where ended_at is null;

-- Pertraukos savininką visada nustato serveris pagal darbo laiko įrašą.
create function public.breaks_set_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select t.user_id into new.user_id from public.time_entries t
   where t.id = new.time_entry_id and t.company_id = new.company_id;
  if new.user_id is null then
    raise exception 'Darbo laiko įrašas nerastas' using errcode = '23503';
  end if;
  return new;
end $$;
create trigger breaks_set_user before insert on public.breaks
  for each row execute function public.breaks_set_user();

-- "Šiandien nedirbu"
create table public.days_off (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  user_id    uuid not null,
  day        date not null,
  created_at timestamptz not null default now(),
  unique (user_id, day),
  foreign key (company_id, user_id) references public.company_members (company_id, user_id)
);

-- ---------------------------------------------------------------- pastabos ir priedai
create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  author_id  uuid not null,
  project_id uuid,
  task_id    uuid,
  kind       text not null default 'text' check (kind in ('text', 'voice')),
  body       text check (char_length(body) <= 4000),
  is_done    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind = 'voice' or char_length(btrim(coalesce(body, ''))) > 0),
  unique (id, company_id),
  foreign key (company_id, author_id) references public.company_members (company_id, user_id),
  foreign key (project_id, company_id) references public.projects (id, company_id) on delete set null (project_id),
  foreign key (task_id, company_id) references public.tasks (id, company_id) on delete set null (task_id)
);
create index notes_company_idx on public.notes (company_id, created_at desc);

create table public.attachments (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null,
  uploaded_by  uuid not null,
  project_id   uuid,
  task_id      uuid,
  note_id      uuid,
  storage_path text not null unique,
  file_name    text not null check (char_length(file_name) <= 200),
  mime_type    text not null,
  size_bytes   bigint not null check (size_bytes between 1 and 26214400),
  created_at   timestamptz not null default now(),
  check (project_id is not null or task_id is not null or note_id is not null),
  check (storage_path like company_id::text || '/%'),
  foreign key (company_id, uploaded_by) references public.company_members (company_id, user_id),
  foreign key (project_id, company_id) references public.projects (id, company_id) on delete cascade,
  foreign key (task_id, company_id) references public.tasks (id, company_id) on delete cascade,
  foreign key (note_id, company_id) references public.notes (id, company_id) on delete cascade
);

-- ---------------------------------------------------------------- triggeriai
create trigger projects_updated   before update on public.projects             for each row execute function public.set_updated_at();
create trigger tasks_updated      before update on public.tasks                for each row execute function public.set_updated_at();
create trigger checklist_updated  before update on public.task_checklist_items for each row execute function public.set_updated_at();
create trigger time_updated       before update on public.time_entries         for each row execute function public.set_updated_at();
create trigger breaks_updated     before update on public.breaks               for each row execute function public.set_updated_at();
create trigger notes_updated      before update on public.notes                for each row execute function public.set_updated_at();

-- Darbuotojas gali keisti tik darbo datą ir būseną; užbaigimo laikas nustatomas serveryje.
create function public.tasks_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_company_admin(old.company_id) then
    if row(new.company_id, new.project_id, new.title, new.description, new.assigned_to, new.created_by)
       is distinct from
       row(old.company_id, old.project_id, old.title, old.description, old.assigned_to, old.created_by) then
      raise exception 'Darbuotojas gali keisti tik darbo datą ir būseną' using errcode = '42501';
    end if;
  end if;
  if new.status = 'done' and old.status <> 'done' then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end $$;
create trigger tasks_guard before update on public.tasks
  for each row execute function public.tasks_guard();

-- ---------------------------------------------------------------- RLS
alter table public.projects             enable row level security;
alter table public.tasks                enable row level security;
alter table public.task_checklist_items enable row level security;
alter table public.time_entries         enable row level security;
alter table public.breaks               enable row level security;
alter table public.days_off             enable row level security;
alter table public.notes                enable row level security;
alter table public.attachments          enable row level security;

-- Objektai: administratorius mato visus; darbuotojas tik tuos, kuriuose turi jam paskirtą darbą.
create policy projects_select on public.projects for select to authenticated
  using (public.is_company_member(company_id)
         and (public.is_company_admin(company_id)
              or exists (select 1 from public.tasks t where t.project_id = projects.id)));
create policy projects_insert on public.projects for insert to authenticated
  with check (public.is_company_admin(company_id) and public.company_has_access(company_id));
create policy projects_update on public.projects for update to authenticated
  using (public.is_company_admin(company_id) and public.company_has_access(company_id))
  with check (public.is_company_admin(company_id));
create policy projects_delete on public.projects for delete to authenticated
  using (public.is_company_admin(company_id) and public.company_has_access(company_id));

-- Darbai
create policy tasks_select on public.tasks for select to authenticated
  using (public.is_company_member(company_id)
         and (public.is_company_admin(company_id) or assigned_to = auth.uid()));
create policy tasks_insert on public.tasks for insert to authenticated
  with check (public.is_company_admin(company_id) and public.company_has_access(company_id));
create policy tasks_update on public.tasks for update to authenticated
  using (public.is_company_member(company_id) and public.company_has_access(company_id)
         and (public.is_company_admin(company_id) or assigned_to = auth.uid()))
  with check (public.is_company_admin(company_id) or assigned_to = auth.uid());
create policy tasks_delete on public.tasks for delete to authenticated
  using (public.is_company_admin(company_id) and public.company_has_access(company_id));

-- Užduočių sąrašas: mato tas, kas mato darbą (RLS taikoma ir vidinei užklausai).
create policy checklist_select on public.task_checklist_items for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id));
create policy checklist_insert on public.task_checklist_items for insert to authenticated
  with check (public.is_company_admin(company_id) and public.company_has_access(company_id));
create policy checklist_update on public.task_checklist_items for update to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id) and public.company_has_access(company_id))
  with check (exists (select 1 from public.tasks t where t.id = task_id));
create policy checklist_delete on public.task_checklist_items for delete to authenticated
  using (public.is_company_admin(company_id) and public.company_has_access(company_id));

-- Darbo laikas: darbuotojas mato ir pradeda tik savo; užbaigti gali tik neužbaigtą įrašą; administratorius valdo visus.
create policy time_select on public.time_entries for select to authenticated
  using (public.is_company_member(company_id) and (user_id = auth.uid() or public.is_company_admin(company_id)));
create policy time_insert on public.time_entries for insert to authenticated
  with check (public.company_has_access(company_id)
              and ((user_id = auth.uid() and public.is_company_member(company_id))
                   or public.is_company_admin(company_id)));
create policy time_update on public.time_entries for update to authenticated
  using (public.company_has_access(company_id)
         and ((user_id = auth.uid() and ended_at is null and public.is_company_member(company_id))
              or public.is_company_admin(company_id)))
  with check (user_id = auth.uid() or public.is_company_admin(company_id));
create policy time_delete on public.time_entries for delete to authenticated
  using (public.is_company_admin(company_id) and public.company_has_access(company_id));

create policy breaks_select on public.breaks for select to authenticated
  using (public.is_company_member(company_id) and (user_id = auth.uid() or public.is_company_admin(company_id)));
create policy breaks_insert on public.breaks for insert to authenticated
  with check (public.company_has_access(company_id) and public.is_company_member(company_id)
              and exists (select 1 from public.time_entries t where t.id = time_entry_id));
create policy breaks_update on public.breaks for update to authenticated
  using (public.company_has_access(company_id)
         and ((user_id = auth.uid() and ended_at is null) or public.is_company_admin(company_id)))
  with check (user_id = auth.uid() or public.is_company_admin(company_id));
create policy breaks_delete on public.breaks for delete to authenticated
  using (public.is_company_admin(company_id) and public.company_has_access(company_id));

create policy days_off_select on public.days_off for select to authenticated
  using (public.is_company_member(company_id) and (user_id = auth.uid() or public.is_company_admin(company_id)));
create policy days_off_insert on public.days_off for insert to authenticated
  with check (public.company_has_access(company_id)
              and ((user_id = auth.uid() and public.is_company_member(company_id)) or public.is_company_admin(company_id)));
create policy days_off_delete on public.days_off for delete to authenticated
  using (public.company_has_access(company_id)
         and ((user_id = auth.uid() and public.is_company_member(company_id)) or public.is_company_admin(company_id)));

-- Pastabos biurui: mato autorius ir administratoriai.
create policy notes_select on public.notes for select to authenticated
  using (public.is_company_member(company_id) and (author_id = auth.uid() or public.is_company_admin(company_id)));
create policy notes_insert on public.notes for insert to authenticated
  with check (author_id = auth.uid() and public.is_company_member(company_id) and public.company_has_access(company_id));
create policy notes_update on public.notes for update to authenticated
  using (public.company_has_access(company_id) and (author_id = auth.uid() or public.is_company_admin(company_id)))
  with check (author_id = auth.uid() or public.is_company_admin(company_id));
create policy notes_delete on public.notes for delete to authenticated
  using (public.company_has_access(company_id) and (author_id = auth.uid() or public.is_company_admin(company_id)));

-- Priedai: mato administratorius, įkėlęs darbuotojas ir darbo vykdytojas.
create policy attachments_select on public.attachments for select to authenticated
  using (public.is_company_member(company_id)
         and (uploaded_by = auth.uid() or public.is_company_admin(company_id)
              or (task_id is not null and exists (select 1 from public.tasks t where t.id = attachments.task_id))));
create policy attachments_insert on public.attachments for insert to authenticated
  with check (uploaded_by = auth.uid() and public.is_company_member(company_id) and public.company_has_access(company_id));
create policy attachments_delete on public.attachments for delete to authenticated
  using (public.company_has_access(company_id) and (uploaded_by = auth.uid() or public.is_company_admin(company_id)));

-- ---------------------------------------------------------------- teisės
revoke all on public.projects, public.tasks, public.task_checklist_items, public.time_entries,
              public.breaks, public.days_off, public.notes, public.attachments from anon, authenticated;
grant select, insert, update, delete on public.projects, public.tasks, public.task_checklist_items,
              public.time_entries, public.breaks, public.notes to authenticated;
grant select, insert, delete on public.days_off, public.attachments to authenticated;

-- ---------------------------------------------------------------- ataskaitų vaizdas
-- Dirbtos minutės (be pertraukų) ir diena pagal Europe/Vilnius. Taiko skambinančiojo RLS.
create view public.time_entry_summary with (security_invoker = true) as
select t.id, t.company_id, t.user_id, t.project_id, t.started_at, t.ended_at,
       public.vilnius_date(t.started_at) as work_date,
       greatest(0, floor(extract(epoch from (coalesce(t.ended_at, now()) - t.started_at)) / 60)
         - coalesce((select floor(sum(extract(epoch from (coalesce(b.ended_at, now()) - b.started_at))) / 60)
                       from public.breaks b where b.time_entry_id = t.id), 0))::int as worked_minutes
from public.time_entries t;
grant select on public.time_entry_summary to authenticated;
