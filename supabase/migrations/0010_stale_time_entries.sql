-- DarboRitmas · 0010 · Neuždaryto laikmačio riba (audito radinys M2)
-- Jei darbuotojas pamiršo paspausti „Baigti“, neužbaigtas įrašas skaičiuojamas ne ilgiau kaip 16 val. nuo pradžios,
-- kad nepūstų valandų suvestinių (administratorius mato įspėjimą ir pataiso tikrą pabaigos laiką).
-- Užbaigtų įrašų trukmė neribojama. Ta pati riba (16 val.) yra ir programoje: src/lib/work/types.ts (STALE_ENTRY_HOURS).

create or replace view public.time_entry_summary with (security_invoker = true) as
select t.id, t.company_id, t.user_id, t.project_id, t.started_at, t.ended_at,
       public.vilnius_date(t.started_at) as work_date,
       greatest(0, floor(extract(epoch from (x.e - t.started_at)) / 60)
         - coalesce((select floor(sum(extract(epoch from greatest(least(coalesce(b.ended_at, now()), x.e) - b.started_at, interval '0'))) / 60)
                       from public.breaks b where b.time_entry_id = t.id), 0))::int as worked_minutes
from public.time_entries t
cross join lateral (
  select case when t.ended_at is null then least(now(), t.started_at + interval '16 hours') else t.ended_at end as e
) x;
