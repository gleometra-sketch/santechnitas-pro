-- DarboRitmas · 0014 · Užduočių sąrašų šablonai
-- 1) Sąrašo punktas gali turėti etapą (prieš darbą / darbo metu / pabaiga), būti privalomas ir reikalauti nuotraukos.
-- 2) Įmonės šablonų lentelės (mato ir keičia tik administratorius). Paruošti šablonai pagal profesiją yra programos kode.
-- 3) Darbuotojas negali užbaigti darbo, kol neatlikti privalomi punktai ir (jei reikia) nėra nuotraukos. Administratorius gali.

alter table public.task_checklist_items
  add column stage       text check (stage in ('before', 'during', 'after')),
  add column required    boolean not null default false,
  add column needs_photo boolean not null default false;

-- Darbuotojas punkte gali keisti tik „atlikta“ žymą (papildyta naujais laukais, kad negalėtų nuimti „privalomas“).
create or replace function public.checklist_guard() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null and not public.is_company_admin(old.company_id) then
    if row(new.company_id, new.task_id, new.title, new.position, new.stage, new.required, new.needs_photo)
       is distinct from row(old.company_id, old.task_id, old.title, old.position, old.stage, old.required, old.needs_photo) then
      raise exception 'Darbuotojas gali keisti tik punkto būseną' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create table public.checklist_templates (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 120),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (company_id, name),
  unique (id, company_id)
);

create table public.checklist_template_items (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null,
  template_id uuid not null,
  title       text not null check (char_length(btrim(title)) between 1 and 200),
  stage       text check (stage in ('before', 'during', 'after')),
  required    boolean not null default false,
  needs_photo boolean not null default false,
  position    integer not null default 0,
  foreign key (template_id, company_id) references public.checklist_templates (id, company_id) on delete cascade
);
create index checklist_template_items_idx on public.checklist_template_items (template_id, position);

alter table public.checklist_templates      enable row level security;
alter table public.checklist_template_items enable row level security;

create policy tpl_select on public.checklist_templates for select to authenticated using (public.is_company_admin(company_id));
create policy tpl_insert on public.checklist_templates for insert to authenticated
  with check (public.is_company_admin(company_id) and public.company_has_access(company_id));
create policy tpl_update on public.checklist_templates for update to authenticated
  using (public.is_company_admin(company_id) and public.company_has_access(company_id)) with check (public.is_company_admin(company_id));
create policy tpl_delete on public.checklist_templates for delete to authenticated
  using (public.is_company_admin(company_id) and public.company_has_access(company_id));

create policy tpli_select on public.checklist_template_items for select to authenticated using (public.is_company_admin(company_id));
create policy tpli_insert on public.checklist_template_items for insert to authenticated
  with check (public.is_company_admin(company_id) and public.company_has_access(company_id));
create policy tpli_update on public.checklist_template_items for update to authenticated
  using (public.is_company_admin(company_id) and public.company_has_access(company_id)) with check (public.is_company_admin(company_id));
create policy tpli_delete on public.checklist_template_items for delete to authenticated
  using (public.is_company_admin(company_id) and public.company_has_access(company_id));

grant select, insert, update, delete on public.checklist_templates, public.checklist_template_items to authenticated;

-- Darbo užbaigimas: darbuotojas negali užbaigti, kol neatlikti privalomi punktai ir (jei yra „reikia nuotraukos“ punktas) nėra nuotraukos.
create function public.tasks_complete_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'done' and old.status <> 'done' and auth.uid() is not null and not public.is_company_admin(new.company_id) then
    if exists (select 1 from public.task_checklist_items i where i.task_id = new.id and i.required and not i.is_done) then
      raise exception 'Pažymėkite visus privalomus punktus prieš užbaigdami darbą.';
    end if;
    if exists (select 1 from public.task_checklist_items i where i.task_id = new.id and i.needs_photo)
       and not exists (select 1 from public.attachments a where a.task_id = new.id and a.mime_type like 'image/%') then
      raise exception 'Prieš užbaigdami darbą pridėkite bent vieną nuotrauką.';
    end if;
  end if;
  return new;
end $$;

create trigger tasks_complete_guard before update on public.tasks
  for each row execute function public.tasks_complete_guard();
