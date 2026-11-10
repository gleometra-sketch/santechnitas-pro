-- DarboRitmas · 0009 · Darbo laiko vientisumas serveryje (audito radiniai A1 ir M3)
--
-- Anksčiau laikus siųsdavo naršyklė, todėl tiesioginė užklausa į Supabase API galėjo pridėti ar pailginti valandas.
-- Dabar ne administratoriaus (darbuotojo) užklausoms laiką nustato duomenų bazė:
--   * darbo ir pertraukos PRADŽIA visada yra serverio laikas;
--   * PABAIGA nustatoma tik užbaigiant ir visada yra serverio laikas;
--   * po sukūrimo keisti pradžios, naudotojo, objekto ar įmonės negalima;
--   * užbaigtų įrašų darbuotojas kurti negali.
-- Administratorius (taisymai, praleisti įrašai) ir saugios SQL funkcijos (pvz. objekto perjungimas) taisyklių neapriboti.
-- Taisyklės taikomos tik tiesioginėms `authenticated` rolės užklausoms (current_user), todėl migracijos,
-- `service_role` ir `security definer` funkcijos veikia kaip anksčiau.

create function public.time_entries_guard() returns trigger
language plpgsql as $$
begin
  if current_user <> 'authenticated' or public.is_company_admin(coalesce(new.company_id, old.company_id)) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.ended_at is not null then
      raise exception 'Darbuotojas negali kurti užbaigtų laiko įrašų' using errcode = '42501';
    end if;
    new.started_at := clock_timestamp();
    return new;
  end if;

  if row(new.company_id, new.user_id, new.project_id, new.started_at)
     is distinct from row(old.company_id, old.user_id, old.project_id, old.started_at) then
    raise exception 'Darbuotojas gali tik užbaigti savo darbą' using errcode = '42501';
  end if;
  if new.ended_at is distinct from old.ended_at then
    new.ended_at := clock_timestamp();
  end if;
  return new;
end $$;

create trigger time_entries_guard before insert or update on public.time_entries
  for each row execute function public.time_entries_guard();

create function public.breaks_guard() returns trigger
language plpgsql as $$
begin
  if current_user <> 'authenticated' or public.is_company_admin(coalesce(new.company_id, old.company_id)) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.ended_at is not null then
      raise exception 'Darbuotojas negali kurti užbaigtų pertraukų' using errcode = '42501';
    end if;
    new.started_at := clock_timestamp();
    return new;
  end if;

  if row(new.company_id, new.time_entry_id, new.user_id, new.started_at)
     is distinct from row(old.company_id, old.time_entry_id, old.user_id, old.started_at) then
    raise exception 'Darbuotojas gali tik užbaigti pertrauką' using errcode = '42501';
  end if;
  if new.ended_at is distinct from old.ended_at then
    if old.ended_at is not null then
      raise exception 'Pertrauka jau užbaigta' using errcode = '42501';
    end if;
    new.ended_at := clock_timestamp();
  end if;
  return new;
end $$;

create trigger breaks_guard before insert or update on public.breaks
  for each row execute function public.breaks_guard();

-- Užduočių sąrašo punkte darbuotojas gali keisti tik „atlikta“ žymą (pavadinimą, poziciją ir darbą keičia administratorius).
create function public.checklist_guard() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null and not public.is_company_admin(old.company_id) then
    if row(new.company_id, new.task_id, new.title, new.position)
       is distinct from row(old.company_id, old.task_id, old.title, old.position) then
      raise exception 'Darbuotojas gali keisti tik punkto būseną' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger checklist_guard before update on public.task_checklist_items
  for each row execute function public.checklist_guard();
