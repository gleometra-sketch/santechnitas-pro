-- Rangovo (direktoriaus) parašas įmonės rekvizituose: automatiškai patenka į kiekvieną naują sutartį.
alter table public.company_profiles add column if not exists signature text
  check (signature is null or (signature like 'data:image/png;base64,%' and char_length(signature) <= 250000));

create or replace function public.save_company_profile(p_company uuid, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_sig text := nullif(btrim(coalesce(p->>'signature', '')), '');
begin
  perform public.doc_guard(p_company);
  if v_sig is not null and (v_sig not like 'data:image/png;base64,%' or char_length(v_sig) > 250000) then
    raise exception 'Neteisingas parašo vaizdas.';
  end if;
  insert into public.company_profiles (company_id, legal_name, code, vat_code, address, phone, email, iban, director, director_title, signature)
  values (p_company, nullif(btrim(p->>'legal_name'), ''), nullif(btrim(p->>'code'), ''), nullif(btrim(p->>'vat_code'), ''),
          nullif(btrim(p->>'address'), ''), nullif(btrim(p->>'phone'), ''), nullif(btrim(p->>'email'), ''), nullif(btrim(p->>'iban'), ''),
          nullif(btrim(p->>'director'), ''), nullif(btrim(p->>'director_title'), ''), v_sig)
  on conflict (company_id) do update set legal_name = excluded.legal_name, code = excluded.code, vat_code = excluded.vat_code,
    address = excluded.address, phone = excluded.phone, email = excluded.email, iban = excluded.iban,
    director = excluded.director, director_title = excluded.director_title,
    -- Be „signature“ rakto (senas klientas) esamas parašas paliekamas; su tuščia reikšme – pašalinamas.
    signature = case when p ? 'signature' then excluded.signature else public.company_profiles.signature end,
    updated_at = now();
end $$;

-- Išsiuntimo metu rekvizitų kopijoje dabar ir rangovo parašas (kita logika nepakeista).
create or replace function public.send_document(p_id uuid, p_token text) returns text
language plpgsql security definer set search_path = public as $$
declare d public.documents; v_company uuid; v_seller jsonb; v_items integer; v_name text;
begin
  select company_id into v_company from public.documents where id = p_id;
  perform public.doc_guard(v_company);
  select * into d from public.documents where id = p_id and company_id = v_company for update;
  if d.status not in ('draft', 'sent') then raise exception 'Šio dokumento išsiųsti nebegalima.'; end if;
  if d.status = 'sent' then return d.public_token; end if;
  if d.kind = 'estimate' then
    select count(*) into v_items from public.document_items where document_id = p_id;
    if v_items = 0 then raise exception 'Sąmatoje nėra eilučių.'; end if;
  elsif coalesce(btrim(d.body), '') = '' then
    raise exception 'Sutarties tekstas tuščias.';
  end if;
  if char_length(p_token) < 32 then raise exception 'Neteisingas kodas.'; end if;

  select coalesce(jsonb_build_object('legal_name', coalesce(cp.legal_name, c.name), 'code', cp.code, 'vat_code', cp.vat_code,
           'address', cp.address, 'phone', cp.phone, 'email', cp.email, 'iban', cp.iban,
           'director', cp.director, 'director_title', cp.director_title, 'signature', cp.signature), '{}'::jsonb)
    into v_seller from public.companies c left join public.company_profiles cp on cp.company_id = c.id where c.id = v_company;

  update public.documents set status = 'sent', public_token = coalesce(public_token, p_token), seller = v_seller,
         sent_at = coalesce(sent_at, now()) where id = p_id returning * into d;
  select coalesce(full_name, email) into v_name from public.profiles where id = auth.uid();
  perform public.doc_log(d, 'sent', v_name, null);
  perform public.notify_admins(d.company_id, 'document_status',
    case d.kind when 'estimate' then 'Sąmata išsiųsta' else 'Sutartis išsiųsta' end,
    d.number || ' · ' || d.client_name || ' · ' || to_char(d.total_gross, 'FM999999990.00') || ' €',
    jsonb_build_object('document_id', d.id, 'status', 'sent'), auth.uid());
  return d.public_token;
end $$;

notify pgrst, 'reload schema';
