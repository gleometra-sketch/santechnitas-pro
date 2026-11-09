-- SANTECHNITAS PRO · 0004 · Medžiagos: darbuotojų poreikiai biurui ir administratoriaus pirkimai

create table public.material_requests (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null,
  employee_id uuid not null,
  project_id  uuid,
  comment     text check (char_length(comment) <= 1000),
  status      text not null default 'open' check (status in ('open', 'completed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, company_id),
  foreign key (company_id, employee_id) references public.company_members (company_id, user_id),
  foreign key (project_id, company_id) references public.projects (id, company_id) on delete set null (project_id)
);
create index material_requests_company_idx on public.material_requests (company_id, created_at desc);

create table public.material_request_items (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null,
  request_id    uuid not null,
  material_name text not null check (char_length(btrim(material_name)) between 1 and 200),
  quantity      numeric(10, 2) not null check (quantity > 0),
  unit          text not null check (unit in ('vnt.', 'm', 'kg', 'l', 'rul.', 'kompl.', 'pak.', 'dėž.')),
  status        text not null default 'needed' check (status in ('needed', 'purchased')),
  purchased_by  uuid references public.profiles (id) on delete set null,
  purchased_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  foreign key (request_id, company_id) references public.material_requests (id, company_id) on delete cascade
);
create index material_items_status_idx on public.material_request_items (company_id, status, created_at desc);
create index material_items_request_idx on public.material_request_items (request_id);

create trigger material_requests_updated before update on public.material_requests
  for each row execute function public.set_updated_at();
create trigger material_items_updated before update on public.material_request_items
  for each row execute function public.set_updated_at();

-- Pirkimo žymą (kas ir kada) nustato tik serveris; viena eilutė neuždaro kitų.
create function public.material_item_before() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'needed';
    new.purchased_by := null;
    new.purchased_at := null;
    return new;
  end if;
  if new.status = 'purchased' and old.status <> 'purchased' then
    new.purchased_by := auth.uid();
    new.purchased_at := now();
  elsif new.status = 'needed' then
    new.purchased_by := null;
    new.purchased_at := null;
  end if;
  return new;
end $$;
create trigger material_item_before before insert or update on public.material_request_items
  for each row execute function public.material_item_before();

-- Prašymas tampa 'completed', kai visos jo medžiagos nupirktos; atšaukus pirkimą grįžta į 'open'.
create function public.material_item_after() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rid uuid := coalesce(new.request_id, old.request_id);
begin
  update public.material_requests r
     set status = case when exists (select 1 from public.material_request_items i
                                     where i.request_id = rid and i.status = 'needed')
                       or not exists (select 1 from public.material_request_items i where i.request_id = rid)
                       then 'open' else 'completed' end
   where r.id = rid;
  return null;
end $$;
create trigger material_item_after after insert or update or delete on public.material_request_items
  for each row execute function public.material_item_after();

alter table public.material_requests      enable row level security;
alter table public.material_request_items enable row level security;

-- Prašymus mato autorius ir administratoriai.
create policy mreq_select on public.material_requests for select to authenticated
  using (public.is_company_member(company_id) and (employee_id = auth.uid() or public.is_company_admin(company_id)));
create policy mreq_insert on public.material_requests for insert to authenticated
  with check (public.company_has_access(company_id) and public.is_company_member(company_id)
              and (employee_id = auth.uid() or public.is_company_admin(company_id)));
create policy mreq_update on public.material_requests for update to authenticated
  using (public.is_company_admin(company_id) and public.company_has_access(company_id))
  with check (public.is_company_admin(company_id));
create policy mreq_delete on public.material_requests for delete to authenticated
  using (public.is_company_admin(company_id) and public.company_has_access(company_id));

-- Eilutes mato tas, kas mato prašymą. Pridėti gali prašymo autorius arba administratorius.
create policy mitem_select on public.material_request_items for select to authenticated
  using (exists (select 1 from public.material_requests r where r.id = request_id));
create policy mitem_insert on public.material_request_items for insert to authenticated
  with check (public.company_has_access(company_id)
              and exists (select 1 from public.material_requests r
                           where r.id = request_id and r.company_id = material_request_items.company_id
                             and (r.employee_id = auth.uid() or public.is_company_admin(r.company_id))));
create policy mitem_update on public.material_request_items for update to authenticated
  using (public.is_company_admin(company_id) and public.company_has_access(company_id))
  with check (public.is_company_admin(company_id));
create policy mitem_delete on public.material_request_items for delete to authenticated
  using (public.is_company_admin(company_id) and public.company_has_access(company_id));

revoke all on public.material_requests, public.material_request_items from anon, authenticated;
grant select, insert, update, delete on public.material_requests, public.material_request_items to authenticated;
