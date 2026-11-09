-- SANTECHNITAS PRO · 0007 · Medžiagų administravimas: daugiau matavimo vienetų ir indeksai filtrams

-- Papildomi vienetai (m², m³, poros, ryšuliai). Seni įrašai lieka galioti.
alter table public.material_request_items drop constraint if exists material_request_items_unit_check;
alter table public.material_request_items add constraint material_request_items_unit_check
  check (unit in ('vnt.', 'm', 'kg', 'l', 'rul.', 'kompl.', 'pak.', 'dėž.', 'm²', 'm³', 'por.', 'ryš.'));

-- Administratoriaus sąrašo filtrai: pagal darbuotoją, objektą ir pirkimo datą.
create index if not exists material_requests_employee_idx on public.material_requests (company_id, employee_id, created_at desc);
create index if not exists material_requests_project_idx  on public.material_requests (company_id, project_id);
create index if not exists material_items_purchased_idx   on public.material_request_items (company_id, purchased_at desc) where status = 'purchased';
