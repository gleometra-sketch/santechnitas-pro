-- Kliento parašas pirštu ant sutarties „Užsakovas“ eilutės.
-- Parašas (PNG data URL) saugomas prie dokumento; sutarties negalima patvirtinti be jo.

alter table public.documents add column if not exists responded_signature text
  check (responded_signature is null or (responded_signature like 'data:image/png;base64,%' and char_length(responded_signature) <= 250000));

drop function if exists public.document_respond(text, text, text, text, text);

create function public.document_respond(p_token text, p_decision text, p_name text, p_note text, p_ip text, p_signature text default null)
returns text
language plpgsql security definer set search_path = public as $$
declare d public.documents; v_label text; v_sig text := nullif(btrim(coalesce(p_signature, '')), '');
begin
  if p_decision not in ('approved', 'declined') then raise exception 'Neteisingas sprendimas.'; end if;
  select * into d from public.documents where public_token = p_token for update;
  if not found then raise exception 'Nuoroda negalioja.'; end if;
  if d.status = 'approved' or d.status = 'declined' then raise exception 'Į šį dokumentą jau atsakyta.'; end if;
  if d.status <> 'sent' then raise exception 'Šio dokumento patvirtinti nebegalima.'; end if;
  if d.valid_until is not null and d.valid_until < public.vilnius_date(now()) then raise exception 'Pasiūlymo galiojimas pasibaigęs.'; end if;
  if p_decision = 'approved' and char_length(btrim(coalesce(p_name, ''))) < 3 then raise exception 'Įrašykite savo vardą ir pavardę.'; end if;
  if p_decision = 'approved' and d.kind = 'contract' and (v_sig is null or char_length(v_sig) < 400) then
    raise exception 'Sutartį reikia pasirašyti pirštu ant ekrano.';
  end if;
  if v_sig is not null and (v_sig not like 'data:image/png;base64,%' or char_length(v_sig) > 250000) then
    raise exception 'Neteisingas parašo vaizdas.';
  end if;

  update public.documents set status = p_decision, responded_at = now(), responded_name = nullif(btrim(p_name), ''),
         response_note = nullif(btrim(p_note), ''), responded_ip = nullif(left(p_ip, 80), ''),
         responded_signature = case when p_decision = 'approved' then v_sig else null end
   where id = d.id returning * into d;
  perform public.doc_log(d, p_decision, coalesce(nullif(btrim(p_name), ''), d.client_name), nullif(btrim(p_note), ''));
  v_label := case d.kind when 'estimate' then 'Sąmata' else 'Sutartis' end;
  perform public.notify_admins(d.company_id, 'document_status',
    case p_decision when 'approved' then 'Klientas patvirtino: ' || lower(v_label) else 'Klientas atmetė: ' || lower(v_label) end,
    d.number || ' · ' || d.client_name || ' · ' || to_char(d.total_gross, 'FM999999990.00') || ' €'
      || coalesce(E'\n' || nullif(btrim(p_note), ''), ''),
    jsonb_build_object('document_id', d.id, 'status', p_decision));
  return d.number;
end $$;

revoke execute on function public.document_respond(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.document_respond(text, text, text, text, text, text) to service_role;

notify pgrst, 'reload schema';
