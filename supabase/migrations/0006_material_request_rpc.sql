-- SANTECHNITAS PRO · 0006 · Medžiagų prašymo sukūrimas viena atominė operacija
-- Vykdoma skambinančiojo teisėmis (security invoker), todėl galioja visos RLS taisyklės.

create function public.create_material_request(
  p_company_id uuid, p_project_id uuid, p_comment text, p_items jsonb
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'Reikia nuo 1 iki 50 medžiagų' using errcode = '22023';
  end if;

  insert into public.material_requests (company_id, employee_id, project_id, comment)
  values (p_company_id, auth.uid(), p_project_id, nullif(btrim(p_comment), ''))
  returning id into v_id;

  insert into public.material_request_items (company_id, request_id, material_name, quantity, unit)
  select p_company_id, v_id, btrim(i.name), i.quantity, i.unit
    from jsonb_to_recordset(p_items) as i(name text, quantity numeric, unit text);

  return v_id;
end $$;

revoke execute on function public.create_material_request(uuid, uuid, text, jsonb) from public, anon;
grant  execute on function public.create_material_request(uuid, uuid, text, jsonb) to authenticated;
