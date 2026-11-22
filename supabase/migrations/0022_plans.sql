-- DarboRitmas · 0022 · Planai (Bazinis / Pro / Verslui), limitai, naudojimo skaitiklis
-- Paleisti po 0021_paddle.sql. Taisyklės vykdomos duomenų bazėje (triggeriais), todėl jų neapeina nei tiesioginės
-- užklausos, nei kopijavimas ar būsenų keitimas.
--
-- Plano nustatymas (_company_plan):  nemokama prieiga = verslui;  aktyvi / bandomoji / vėluojanti prenumerata =
-- jos planas (be plan_id = bazinis);  galiojantis nemokamas bandymas = pro;  kitaip nėra plano (prieigos nėra).

alter table public.subscriptions add column if not exists plan_id text check (plan_id in ('bazinis', 'pro', 'verslui'));

-- ---------------------------------------------------------------- limitai (vienintelis šaltinis; src/lib/plans.ts turi sutapti, tai tikrina testas)
create table public.plan_limits (
  plan  text    not null check (plan in ('bazinis', 'pro', 'verslui')),
  key   text    not null check (key in ('documents', 'telegram', 'cars')),
  value integer not null check (value >= 0),
  hard  boolean not null,          -- true = viršyti negalima; false = sąžiningo naudojimo riba (tik įspėjimas)
  primary key (plan, key)
);
insert into public.plan_limits (plan, key, value, hard) values
  ('bazinis', 'documents', 10,   true),  ('bazinis', 'telegram', 0,    true),  ('bazinis', 'cars', 0,  true),
  ('pro',     'documents', 40,   true),  ('pro',     'telegram', 300,  true),  ('pro',     'cars', 2,  true),
  ('verslui', 'documents', 300,  false), ('verslui', 'telegram', 5000, false), ('verslui', 'cars', 10, true);
alter table public.plan_limits enable row level security;
create policy plan_limits_select on public.plan_limits for select to authenticated using (true);
revoke all on public.plan_limits from anon, authenticated;
grant select on public.plan_limits to authenticated;

-- ---------------------------------------------------------------- planas
create function public._company_plan(cid uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
           when c.complimentary then 'verslui'
           when s.status in ('trialing', 'active', 'past_due') then coalesce(s.plan_id, 'bazinis')
           when c.trial_ends_at > now() then 'pro'
         end
    from public.companies c
    left join public.subscriptions s on s.company_id = c.id
   where c.id = cid
$$;
revoke execute on function public._company_plan(uuid) from public, anon, authenticated;
grant  execute on function public._company_plan(uuid) to service_role;

-- Programai: planas matomas visiems įmonės nariams.
create function public.company_plan(cid uuid) returns text
language sql stable security definer set search_path = public as $$
  select case when public.is_company_member(cid) then public._company_plan(cid) end
$$;
revoke execute on function public.company_plan(uuid) from public, anon;
grant  execute on function public.company_plan(uuid) to authenticated;

-- Mėnesio pradžia pagal Lietuvos laiką (limitai atsinaujina kalendorinio mėnesio pradžioje).
create function public.usage_period() returns date
language sql stable as $$ select date_trunc('month', timezone('Europe/Vilnius', now()))::date $$;

-- ---------------------------------------------------------------- naudojimo skaitiklis (nebetrinamas)
-- ref_id be FK: ištrynus dokumentą jo vienetas negrąžinamas.
create table public.usage_events (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  kind       text not null check (kind in ('document', 'telegram')),
  category   text,
  ref_id     uuid,
  period     date not null default public.usage_period(),
  created_at timestamptz not null default now()
);
create unique index usage_events_doc_ref_uq on public.usage_events (company_id, kind, ref_id) where ref_id is not null;
create index usage_events_period_idx on public.usage_events (company_id, kind, period);
alter table public.usage_events enable row level security;
create policy usage_events_select on public.usage_events for select to authenticated using (public.is_company_admin(company_id));
revoke all on public.usage_events from anon, authenticated;
grant select on public.usage_events to authenticated;

create table public.usage_alerts (
  company_id uuid not null references public.companies (id) on delete cascade,
  period     date not null,
  kind       text not null,
  level      integer not null check (level in (80, 100)),
  created_at timestamptz not null default now(),
  primary key (company_id, period, kind, level)
);
alter table public.usage_alerts enable row level security;
revoke all on public.usage_alerts from anon, authenticated;

-- Įspėjimas administratoriams programoje (vieną kartą per mėnesį kiekvienam lygiui).
create function public.usage_alert(p_company uuid, p_kind text, p_level integer, p_used integer, p_limit integer, p_hard boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_n integer; v_title text; v_body text;
begin
  insert into public.usage_alerts (company_id, period, kind, level) values (p_company, public.usage_period(), p_kind, p_level)
  on conflict do nothing;
  get diagnostics v_n = row_count;
  if v_n = 0 then return; end if;

  if p_kind = 'documents' then
    if p_level = 80 then
      v_title := 'Artėjate prie dokumentų limito';
      v_body  := format('Šį mėnesį sukurta %s iš %s sąmatų ir sutarčių. Daugiau galite su aukštesniu planu (Valdymas → Abonementas).', p_used, p_limit);
    elsif p_hard then
      v_title := 'Dokumentų limitas pasiektas';
      v_body  := format('Šį mėnesį panaudota %s iš %s. Naujų sąmatų ir sutarčių kurti nebegalima iki mėnesio pabaigos; esamus galite peržiūrėti, siųsti ir (juodraščius) taisyti. Daugiau: Valdymas → Abonementas.', p_used, p_limit);
    else
      v_title := 'Pasiekta sąžiningo naudojimo riba';
      v_body  := format('Šį mėnesį sukurta %s sąmatų ir sutarčių (riba %s). Naudojimo neribojame, susisieksime dėl tinkamiausio sprendimo.', p_used, p_limit);
    end if;
  else
    if p_level = 80 then
      v_title := 'Telegram limitas artėja';
      v_body  := format('Šį mėnesį išsiųsta %s iš %s Telegram žinučių. Darbo pradžios ir pabaigos žinutės sustabdytos, svarbūs pranešimai (dokumentai, medžiagos, pastabos, automobiliai) siunčiami toliau. Visi pranešimai matomi programos varpelyje.', p_used, p_limit);
    elsif p_hard then
      v_title := 'Telegram limitas pasiektas';
      v_body  := format('Šį mėnesį išsiųsta %s iš %s žinučių, todėl Telegram pranešimai sustabdyti iki mėnesio pabaigos. Programos varpelis veikia toliau. Daugiau: Valdymas → Abonementas.', p_used, p_limit);
    else
      v_title := 'Pasiekta Telegram sąžiningo naudojimo riba';
      v_body  := format('Šį mėnesį išsiųsta %s Telegram žinučių (riba %s). Pranešimų nestabdome, susisieksime dėl tinkamiausio sprendimo.', p_used, p_limit);
    end if;
  end if;

  perform public.notify_admins(p_company, 'plan_usage', v_title, v_body,
                               jsonb_build_object('kind', p_kind, 'level', p_level, 'used', p_used, 'limit', p_limit));
end $$;
revoke execute on function public.usage_alert(uuid, text, integer, integer, integer, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------- dokumentų vienetas
-- Vienetas sunaudojamas VIENĄ kartą, kai dokumentas (sąmata, sutartis ar kopija) pirmą kartą gauna turinį.
-- Redagavimas, siuntimas, būsenų keitimas, atšaukimas ir ištrynimas vieneto nekeičia ir negrąžina.
create function public.consume_document_unit(p_company uuid, p_ref uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_plan text; v_limit integer; v_hard boolean; v_used integer;
begin
  if exists (select 1 from public.usage_events where company_id = p_company and kind = 'document' and ref_id = p_ref) then return; end if;
  v_plan := public._company_plan(p_company);
  if v_plan is null then return; end if;  -- prieigos nėra: kurti neleidžia RLS

  perform pg_advisory_xact_lock(hashtextextended('doc:' || p_company::text, 0));
  if exists (select 1 from public.usage_events where company_id = p_company and kind = 'document' and ref_id = p_ref) then return; end if;

  select l.value, l.hard into v_limit, v_hard from public.plan_limits l where l.plan = v_plan and l.key = 'documents';
  select count(*) into v_used from public.usage_events where company_id = p_company and kind = 'document' and period = public.usage_period();

  if v_hard and v_used >= v_limit then
    raise exception 'Jūsų plano dokumentų limitas pasiektas (% per mėnesį). Atnaujinkite planą (Valdymas → Abonementas) arba palaukite kito mėnesio.', v_limit
      using errcode = 'P0001';
  end if;

  insert into public.usage_events (company_id, kind, ref_id) values (p_company, 'document', p_ref) on conflict do nothing;
  v_used := v_used + 1;
  if v_hard and v_used >= ceil(v_limit * 0.8) then perform public.usage_alert(p_company, 'documents', 80, v_used, v_limit, v_hard); end if;
  if v_used >= v_limit then perform public.usage_alert(p_company, 'documents', 100, v_used, v_limit, v_hard); end if;
end $$;
revoke execute on function public.consume_document_unit(uuid, uuid) from public, anon, authenticated;

create function public.estimate_lines_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if btrim(coalesce(new.name, '')) <> '' then perform public.consume_document_unit(new.company_id, new.estimate_id); end if;
  return null;
end $$;
create trigger estimate_lines_count after insert on public.estimate_lines
  for each row execute function public.estimate_lines_count();

create function public.document_items_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.consume_document_unit(new.company_id, new.document_id);
  return null;
end $$;
create trigger document_items_count after insert on public.document_items
  for each row execute function public.document_items_count();

create function public.documents_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'contract' and btrim(coalesce(new.body, '')) <> '' then perform public.consume_document_unit(new.company_id, new.id); end if;
  return null;
end $$;
create trigger documents_count after insert or update of body on public.documents
  for each row execute function public.documents_count();

-- Jau esami dokumentai neskaičiuojami iš naujo (jų vienetai priskiriami jų sukūrimo mėnesiui).
insert into public.usage_events (company_id, kind, ref_id, period, created_at)
select e.company_id, 'document', e.id, date_trunc('month', timezone('Europe/Vilnius', e.created_at))::date, e.created_at
  from public.estimates e
 where exists (select 1 from public.estimate_lines l where l.estimate_id = e.id and btrim(l.name) <> '')
on conflict do nothing;
insert into public.usage_events (company_id, kind, ref_id, period, created_at)
select d.company_id, 'document', d.id, date_trunc('month', timezone('Europe/Vilnius', d.created_at))::date, d.created_at
  from public.documents d
 where exists (select 1 from public.document_items i where i.document_id = d.id)
    or (d.kind = 'contract' and btrim(coalesce(d.body, '')) <> '')
on conflict do nothing;

-- ---------------------------------------------------------------- sąmatų užrakinimas
-- Pasitraukus iš juodraščio (išsiųsta, patvirtinta, atmesta) turinio keisti ir grįžti į juodraštį nebegalima;
-- reikia kopijos (ji sunaudoja naują vienetą). Taip limito neapeisi vienos sąmatos perrašinėjimu.
create or replace function public.estimates_guard() returns trigger
language plpgsql as $$
begin
  if new.company_id <> old.company_id or new.number <> old.number then
    raise exception 'Sąmatos įmonės ar numerio keisti negalima' using errcode = '42501';
  end if;
  if old.status <> 'draft' then
    if new.status = 'draft' then
      raise exception 'Išsiųstos sąmatos negalima grąžinti į juodraštį. Sukurkite kopiją.' using errcode = 'P0001';
    end if;
    if (new.title, new.project_id, new.client_name, new.client_phone, new.client_email, new.address,
        new.vat_percent, new.discount_percent, new.valid_until, new.notes)
       is distinct from
       (old.title, old.project_id, old.client_name, old.client_phone, old.client_email, old.address,
        old.vat_percent, old.discount_percent, old.valid_until, old.notes) then
      raise exception 'Išsiųstos sąmatos turinio keisti negalima. Sukurkite kopiją.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

create function public.estimate_lines_lock() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_id uuid := coalesce(new.estimate_id, old.estimate_id); v_status text;
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;                         -- kaskada ištrinant sąmatą
  if current_setting('app.est_save', true) = v_id::text then return coalesce(new, old); end if;   -- save_estimate pats patikrina būseną
  select status into v_status from public.estimates where id = v_id;
  if v_status is not null and v_status <> 'draft' then
    raise exception 'Išsiųstos sąmatos eilučių keisti negalima. Sukurkite kopiją.' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end $$;
create trigger estimate_lines_lock before insert or delete on public.estimate_lines
  for each row execute function public.estimate_lines_lock();

-- Kaip 0016 versija; skirtumai: nejuodraštinė sąmata keičia tik būseną (į kitą nei juodraštis), o juodraštis
-- išsaugomas kaip anksčiau (galima ir iškart pažymėti „išsiųsta“).
create or replace function public.save_estimate(p_id uuid, p_header jsonb, p_lines jsonb, p_learn boolean default true)
returns void
language plpgsql security invoker set search_path = public as $$
declare
  v_company uuid;
  v_old     text;
  v_rows    integer;
begin
  if p_header is null or jsonb_typeof(p_header) <> 'object' or p_lines is null or jsonb_typeof(p_lines) <> 'array' then
    raise exception 'Neteisingi duomenys' using errcode = '22023';
  end if;
  if jsonb_array_length(p_lines) > 300 then
    raise exception 'Per daug eilučių (daugiausia 300)' using errcode = '22023';
  end if;

  select e.company_id, e.status into v_company, v_old from public.estimates e where e.id = p_id;
  if v_company is null then
    raise exception 'Sąmata nerasta';
  end if;

  if v_old <> 'draft' then
    if coalesce(p_header ->> 'status', '') not in ('sent', 'accepted', 'rejected') then
      raise exception 'Išsiųstos sąmatos negalima grąžinti į juodraštį. Sukurkite kopiją.' using errcode = 'P0001';
    end if;
    update public.estimates set status = p_header ->> 'status' where id = p_id;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      raise exception 'Neturite teisės keisti šios sąmatos' using errcode = '42501';
    end if;
    return;  -- turinys užrakintas
  end if;

  perform set_config('app.est_save', p_id::text, true);

  update public.estimates set
    title            = coalesce(btrim(p_header ->> 'title'), ''),
    project_id       = nullif(p_header ->> 'projectId', '')::uuid,
    client_name      = nullif(btrim(p_header ->> 'clientName'), ''),
    client_phone     = nullif(btrim(p_header ->> 'clientPhone'), ''),
    client_email     = nullif(btrim(p_header ->> 'clientEmail'), ''),
    address          = nullif(btrim(p_header ->> 'address'), ''),
    status           = p_header ->> 'status',
    vat_percent      = (p_header ->> 'vatPercent')::numeric,
    discount_percent = (p_header ->> 'discountPercent')::numeric,
    valid_until      = nullif(p_header ->> 'validUntil', '')::date,
    notes            = nullif(btrim(p_header ->> 'notes'), '')
  where id = p_id;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then  -- RLS neleido keisti (pvz. pasibaigusi prieiga)
    raise exception 'Neturite teisės keisti šios sąmatos' using errcode = '42501';
  end if;

  delete from public.estimate_lines where estimate_id = p_id;
  insert into public.estimate_lines (company_id, estimate_id, position, kind, name, unit, quantity, unit_price_cents)
  select v_company, p_id, i.pos, i.kind, btrim(i.name), btrim(i.unit), i.quantity, i.price
    from jsonb_to_recordset(p_lines) as i(pos integer, kind text, name text, unit text, quantity numeric, price integer);

  if p_learn then
    insert into public.estimate_catalog (company_id, kind, name, unit, unit_price_cents, last_used_at)
    select distinct on (l.kind, lower(btrim(l.name))) l.company_id, l.kind, l.name, l.unit, l.unit_price_cents, now()
      from public.estimate_lines l
     where l.estimate_id = p_id and l.unit_price_cents > 0
     order by l.kind, lower(btrim(l.name)), l.position desc
    on conflict (company_id, kind, name_key) do update
      set name = excluded.name, unit = excluded.unit, unit_price_cents = excluded.unit_price_cents,
          last_used_at = excluded.last_used_at;
  end if;
end $$;

-- ---------------------------------------------------------------- automobiliai
-- Nauja arba vėl aktyvuojama mašina neleidžiama, jei pasiektas plano aktyvių automobilių limitas.
create function public.cars_plan_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_plan text; v_limit integer; v_active integer;
begin
  if not new.active then return new; end if;
  if tg_op = 'UPDATE' and old.active then return new; end if;  -- tikriname tik naują arba vėl aktyvuojamą
  v_plan := public._company_plan(new.company_id);
  if v_plan is null then return new; end if;
  select l.value into v_limit from public.plan_limits l where l.plan = v_plan and l.key = 'cars';
  select count(*) into v_active from public.cars c where c.company_id = new.company_id and c.active and c.id <> new.id;
  if v_active >= coalesce(v_limit, 0) then
    if coalesce(v_limit, 0) = 0 then
      raise exception 'Automobilių skiltis prieinama Pro ir Verslui planuose.' using errcode = 'P0001';
    end if;
    raise exception 'Jūsų plane galima iki % aktyvių automobilių. Atnaujinkite planą arba išjunkite nenaudojamą automobilį.', v_limit
      using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger cars_plan_limit_ins before insert on public.cars for each row execute function public.cars_plan_limit();
create trigger cars_plan_limit_upd before update of active on public.cars for each row execute function public.cars_plan_limit();

-- ---------------------------------------------------------------- Telegram kvota (kviečia tik serveris)
-- Viena žinutė = vienas vienetas. „low“ žinutės (darbo pradžia / pabaiga) sustoja pasiekus 80 %, visos – pasiekus 100 %.
-- Funkcija niekada nemeta klaidos: atsisakymas grąžinamas kaip { allowed: false, reason }.
create function public.take_telegram_quota(p_company uuid, p_category text, p_priority text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_plan text; v_limit integer; v_hard boolean; v_used integer;
begin
  v_plan := public._company_plan(p_company);
  if v_plan is null then return jsonb_build_object('allowed', false, 'reason', 'no_plan'); end if;
  select l.value, l.hard into v_limit, v_hard from public.plan_limits l where l.plan = v_plan and l.key = 'telegram';
  if coalesce(v_limit, 0) = 0 then return jsonb_build_object('allowed', false, 'reason', 'plan'); end if;

  perform pg_advisory_xact_lock(hashtextextended('tg:' || p_company::text, 0));
  select count(*) into v_used from public.usage_events where company_id = p_company and kind = 'telegram' and period = public.usage_period();

  if v_hard then
    if v_used >= v_limit then
      return jsonb_build_object('allowed', false, 'reason', 'limit', 'used', v_used, 'limit', v_limit);
    end if;
    if p_priority = 'low' and v_used >= ceil(v_limit * 0.8) then
      perform public.usage_alert(p_company, 'telegram', 80, v_used, v_limit, v_hard);
      return jsonb_build_object('allowed', false, 'reason', 'low_priority_paused', 'used', v_used, 'limit', v_limit);
    end if;
  end if;

  insert into public.usage_events (company_id, kind, category) values (p_company, 'telegram', left(p_category, 40));
  v_used := v_used + 1;
  if v_hard and v_used >= ceil(v_limit * 0.8) then perform public.usage_alert(p_company, 'telegram', 80, v_used, v_limit, v_hard); end if;
  if v_used >= v_limit then perform public.usage_alert(p_company, 'telegram', 100, v_used, v_limit, v_hard); end if;
  return jsonb_build_object('allowed', true, 'used', v_used, 'limit', v_limit);
end $$;
revoke execute on function public.take_telegram_quota(uuid, text, text) from public, anon, authenticated;
grant  execute on function public.take_telegram_quota(uuid, text, text) to service_role;

-- ---------------------------------------------------------------- naudojimo suvestinė administratoriui
create function public.plan_usage(cid uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_plan text; v_period date := public.usage_period();
begin
  if not public.is_company_admin(cid) then return null; end if;
  v_plan := public._company_plan(cid);
  return jsonb_build_object(
    'plan', v_plan,
    'documents', jsonb_build_object(
      'used',  (select count(*) from public.usage_events where company_id = cid and kind = 'document' and period = v_period),
      'limit', (select value from public.plan_limits where plan = v_plan and key = 'documents'),
      'hard',  (select hard  from public.plan_limits where plan = v_plan and key = 'documents')),
    'telegram', jsonb_build_object(
      'used',  (select count(*) from public.usage_events where company_id = cid and kind = 'telegram' and period = v_period),
      'limit', (select value from public.plan_limits where plan = v_plan and key = 'telegram'),
      'hard',  (select hard  from public.plan_limits where plan = v_plan and key = 'telegram')),
    'cars', jsonb_build_object(
      'used',  (select count(*) from public.cars where company_id = cid and active),
      'limit', (select value from public.plan_limits where plan = v_plan and key = 'cars'),
      'hard',  true));
end $$;
revoke execute on function public.plan_usage(uuid) from public, anon;
grant  execute on function public.plan_usage(uuid) to authenticated;

-- ---------------------------------------------------------------- pastaba biurui: pranešimas programoje
-- Telegram žinutę šiai pastabai siunčia serveris tiesiogiai; programos pranešimas užtikrina, kad pastaba nepasimestų
-- pasiekus Telegram limitą.
create function public.notes_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  select coalesce(nullif(btrim(p.full_name), ''), p.email, 'Darbuotojas') into v_name from public.profiles p where p.id = new.author_id;
  perform public.notify_admins(
    new.company_id, 'office_note', 'Pastaba biurui: ' || coalesce(v_name, 'Darbuotojas'),
    case when new.kind = 'voice' then 'Balso pastaba (atidarykite programą).' else left(coalesce(new.body, ''), 500) end,
    jsonb_build_object('note_id', new.id), new.author_id);
  return null;
end $$;
create trigger notes_notify after insert on public.notes for each row execute function public.notes_notify();
