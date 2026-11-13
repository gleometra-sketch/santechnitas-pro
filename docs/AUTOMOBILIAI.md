# Automobiliai

Automobilių modulis: kortelė, terminai (techninė apžiūra, kelių mokestis, draudimas), kilometražas, tepalų likutis, priskyrimo istorija ir priminimai.

## Diegimas
1. Supabase SQL Editor paleiskite `supabase/migrations/0015_cars.sql` (po 0014). Pirmiausia išbandykite testiniame projekte.
2. Nukopijuokite failus į tuos pačius kelius projekte. Pakeisti esami failai: `src/app/(app)/kalendorius/page.tsx`, `src/components/admin/AdminTabs.tsx`, `src/lib/notifications/events.ts`, `src/middleware.ts`.
3. Kasdienis priminimų darbas: kartą per dieną (pvz. 07:00) iškvieskite `POST /api/cars/reminders` su antraštė `Authorization: Bearer <CRON_SECRET>`. Maršrutas sukuria priminimus ir iškart išsiunčia pranešimų eilę.

## Taisyklės
- Administratorius (owner/admin) mato ir tvarko visus automobilius; vairuotojas mato tik savo ir įveda kilometražą.
- Rodmuo negali būti mažesnis nei ankstesnis (tikrina duomenų bazė).
- Pakeitus vairuotoją arba vėl aktyvavus automobilį, reikalingas naujas rodmuo.
- „Neaktyvus“: kilometražo ir tepalų priminimai sustabdomi, o terminų (TA, kelių mokestis, draudimas) lieka; vairuotojo priskyrimas nesikeičia.
- Terminų priminimai siunčiami vairuotojui ir administratoriams likus 30, 14, 7 d. ir kai pasibaigia; kilometražo – vairuotojui kas 7/14/21 d.; tepalų – vairuotojui ir administratoriams.
