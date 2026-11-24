# DarboRitmas

Darbo laiko, objektų, užduočių, medžiagų, automobilių, sąmatų ir sutarčių valdymo programa statybos, santechnikos ir kitoms komandoms, dirbančioms objektuose. Darbuotojas telefone mato savo darbus, žymi darbo laiką, užsako medžiagas ir rašo (ar diktuoja) pastabas biurui. Administratorius tvarko objektus, darbuotojus, valandas, medžiagas, automobilius, sąmatas ir sutartis.

Programa veikia internete adresu `https://darboritmas.gleometra.workers.dev` (Cloudflare Workers). Kodo saugykla: `gleometra-sketch/santechnitas-pro`.

## Technologijos

| Dalis | Ką naudojame |
|---|---|
| Programa | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS |
| Duomenų bazė, prisijungimas, failai | Supabase (PostgreSQL su eilučių lygio saugumu RLS, Auth, Storage) |
| Talpinimas | Cloudflare Workers per `@opennextjs/cloudflare` (build ir diegimas automatiškai po `git push`) |
| Pranešimai | Programoje (varpelis), Telegram botas administratoriams, GitHub Actions kasdienis automobilių priminimas |
| Testai | `node --test` su `tsx` (vienetiniai), PostgreSQL testai (RLS ir dokumentai), Playwright (naršyklės) |
| Automatinis tikrinimas | GitHub Actions (`.github/workflows/ci.yml`) |

## Funkcijos

**Darbuotojas:** darbų kalendorius (savaitė ir mėnuo), darbo laikrodis (pradėti, pertrauka, baigti, nedarbo diena), valandų istorija ir atlyginimo skaičiuoklė, medžiagų užsakymas, pastaba biurui (tekstu ar balsu), objekto kortelė su adresu ir kliento telefonu, savo automobilis ir kilometražo įvedimas, pranešimai.

**Administratorius** (antraštėje „Valdymas“): objektai ir objekto kortelė (klientas, failai, sutartys), darbai su užduočių sąrašais, darbuotojai ir vaidmenys, valandinis įkainis, laiko apskaita ir mėnesio patvirtinimas, ataskaita su CSV eksportu, medžiagų sąrašas su pastabomis iš darbuotojų („Nupirkta“, „Atlikta“), automobiliai (apžiūra, mokestis, draudimas, tepalai, kilometražas), sąmatų skaičiuoklė su kainų ir pavadinimų katalogu, sutartys su nuoroda klientui, Telegram pranešimai.

**Klientas (be paskyros):** gauna nuorodą `/d/<kodas>`, peržiūri sutartį ar sąmatą ir patvirtina arba atmeta. Patvirtinimas išsaugomas su vardu, laiku ir IP adresu (tai ne kvalifikuotas elektroninis parašas).

## Etapų būsena

| Etapas | Būsena |
|---|---|
| 1. Projekto struktūra | Atlikta |
| 2. Dizaino sistema ir pagrindiniai puslapiai (Darbai, Kalendorius, Valandos) | Atlikta |
| 3. Supabase duomenų bazė ir migracijos | Atlikta, `docs/DUOMENU-BAZE.md` |
| 4. Autentifikacija | Atlikta, `docs/AUTENTIFIKACIJA.md` |
| 5. Darbuotojo funkcijos su tikrais duomenimis | Atlikta, `docs/DARBUOTOJAS.md` |
| 6. Administratoriaus aplinka, objektų kortelė, laiko patvirtinimas, ataskaita | Atlikta, `docs/ADMINISTRATORIUS.md`, `docs/OBJEKTAS.md` |
| 7. Medžiagos ir pastabos biurui (tekstu ir balsu) | Atlikta, `docs/MEDZIAGOS.md` |
| 8. Pranešimai (programa, Telegram, tylos valandos) | Atlikta, `docs/PRANESIMAI.md`, `docs/TELEGRAM.md` |
| 9. Automobiliai | Atlikta, `docs/AUTOMOBILIAI.md` |
| 10. Sąmatų skaičiuoklė su katalogu | Atlikta, `docs/SAMATOS.md` |
| 11. Sutartys ir dokumentai klientui | Atlikta, `docs/DOKUMENTAI.md` |
| 12. Automatiniai testai (vienetiniai, duomenų bazės, naršyklės, GitHub Actions) | Atlikta, `docs/TESTAVIMAS.md` |
| 13. Publikavimas Cloudflare Workers | Atlikta, `docs/DIEGIMAS.md` |
| 14. Stripe prenumeratos (mokėjimas internetu) | Laukia. Kol kas pasibaigus bandymui prieigą atkuria administratorius (žr. „Prieiga ir bandymo laikotarpis“) |
| 15. Užduočių sąrašų šablonai | Atidėta: duomenų bazės dalis (`0014_checklist_templates.sql`) yra, puslapio kodo projekte šiuo metu nėra. Žr. `docs/SABLONAI.md` |

## Paleidimas kompiuteryje

Reikia Node.js 20 ar naujesnės versijos ir Supabase projekto.

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run dev
```

Į `.env.local` įrašykite Supabase raktus (žr. lentelę žemiau). Atidarykite http://localhost:3000. Kol raktų nėra, rodomas puslapis „Programa dar neprijungta prie Supabase“.

**Dėmesio:** nuoroda `localhost:3000/d/...` veikia tik jūsų kompiuteryje. Klientui siųskite nuorodą iš tikros svetainės (`https://darboritmas.gleometra.workers.dev`).

| Komanda | Ką daro |
|---|---|
| `npm run dev` | vietinis serveris (pirmas puslapio atidarymas lėtas, nes kompiliuojama) |
| `npm run check` | tipų patikra ir vienetiniai testai (paleiskite prieš kiekvieną `git push`) |
| `npm run typecheck`, `npm test` | tik tipai arba tik vienetiniai testai |
| `npm run test:db` | visos migracijos ir duomenų bazės testai (reikia PostgreSQL 15+ arba Docker, žr. `docs/TESTAVIMAS.md`) |
| `npm run e2e` | naršyklės testai (Playwright) |
| `npm run build` | Next.js gamybinė versija |
| `npm run cf:build` | tas pats, ką vykdo Cloudflare (`opennextjs-cloudflare build`) |
| `npm run deploy` | sukompiliuoja ir įkelia tiesiai į Cloudflare iš jūsų kompiuterio (reikia `npx wrangler login`) |

## Aplinkos kintamieji

Tikrų raktų į Git nedėkite. Vietoje naudokite `.env.local` (kompiuteryje) ir Cloudflare **Settings → Variables and Secrets** (internete).

| Kintamasis | Kam reikalingas | Pastabos |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prisijungimas prie Supabase | `NEXT_PUBLIC_*` įrašomi kompiliuojant, todėl nurodykite ir Cloudflare **Build** kintamuosiuose |
| `SUPABASE_SERVICE_ROLE_KEY` | serverio užduotys: kliento patvirtinimas per nuorodą, Telegram, pranešimų eilė | slaptas, tik serveryje. Be jo nuoroda `/d/...` neveikia |
| `NEXT_PUBLIC_APP_URL` | nuorodos klientui ir Telegram žinutėse | pvz. `https://darboritmas.gleometra.workers.dev` (be `/` gale) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` | Telegram botas | slapti. `TELEGRAM_BOT_USERNAME` nurodytas `wrangler.jsonc` |
| `CRON_SECRET` | apsaugo `/api/notifications/dispatch` ir `/api/cars/reminders` | tas pats kaip GitHub secret `CRON_SECRET` |
| `STRIPE_*` | ateičiai (mokėjimai) | kol kas nenaudojami |

GitHub **Settings → Secrets → Actions**: `APP_URL` (svetainės adresas) ir `CRON_SECRET`.

## Supabase paruošimas

1. Sukurkite projektą (Lietuvai arčiausias regionas: Frankfurt, `eu-central-1`).
2. **SQL Editor** paleiskite `supabase/migrations` failus **iš eilės**, po vieną. Jei failas rašo „already exists“, jis jau įvykdytas.
3. **Authentication → Sign In / Providers → Email:** „Confirm email“ turi būti įjungtas. **URL Configuration:** Site URL ir Redirect URLs nurodykite tikrą svetainės adresą (ir `http://localhost:3000` kūrimui).
4. **Storage:** turi būti saugykla (bucket) pavadinimu `attachments` (sukuria `0005_storage.sql`).
5. **Database → Webhooks:** lentelės `notification_outbox` (Insert) webhook į `https://<svetainė>/api/notifications/dispatch` su antrašte `Authorization: Bearer <CRON_SECRET>` (žr. `docs/PRANESIMAI.md`).

### Migracijos

| Failai | Ką prideda |
|---|---|
| `0001_foundation`, `0002_billing` | įmonės, nariai, prisijungimas, bandymo laikotarpis ir prieigos taisyklė |
| `0003_work` | objektai, darbai, užduotys, darbo laikas, pastabos |
| `0004_materials`, `0006_material_request_rpc`, `0007_material_admin` | medžiagų prašymai, pirkimų sąrašas, vienetai |
| `0005_storage` | failų saugykla |
| `0008`–`0012` | laiko apskaitos režimai, apsauga nuo klastojimo, neuždaryti įrašai, įkainiai, mėnesio patvirtinimas |
| `0013_project_card` | objekto kortelė (klientas, failai) |
| `0014_checklist_templates` | užduočių sąrašų šablonai (kol kas be puslapio) |
| `0014_notifications`, `0014_telegram` | pranešimų eilė ir Telegram prijungimas |
| `0015_cars` | automobiliai ir priminimai |
| `0016_estimates` | sąmatų skaičiuoklė ir katalogas |
| `0020_documents` | sutartys, sąmatų dokumentai, kliento nuoroda ir patvirtinimas |

Numeriai 0017–0019 nenaudojami, tai ne klaida. Trys failai su numeriu `0014` leidžiami bet kuria tvarka.

## Diegimas (Cloudflare)

Cloudflare Workers Builds sukonfigūruotas taip: **Build command** `npx opennextjs-cloudflare build`, **Deploy command** `npx wrangler deploy`. Po kiekvieno `git push` į `main` Cloudflare pats sukompiliuoja ir paskelbia naują versiją (apie 2 minutes). Būsena: Cloudflare → Workers & Pages → darboritmas → **Deployments**. Žalia „Ready“ reiškia sėkmę. Jei kas nors sugedo, to paties sąrašo versiją galima atstatyti per **Rollback**. Visa eiga: `docs/DIEGIMAS.md`.

## Prieiga ir bandymo laikotarpis

Nauja įmonė gauna 14 dienų nemokamą bandymą (`companies.trial_ends_at`). Jam pasibaigus, programa visiems naudotojams rodo pranešimą „Nemokamas bandymas baigėsi“. Prieiga atkuriama dviem būdais (Supabase SQL Editor):

```sql
-- nemokama prieiga visam laikui (jūsų pačių įmonei)
update public.companies set complimentary = true where name = 'JŪSŲ ĮMONĖS PAVADINIMAS';

-- arba pratęsti bandymą
update public.companies set trial_ends_at = now() + interval '30 days' where name = 'JŪSŲ ĮMONĖS PAVADINIMAS';
```

## Projekto struktūra

```
src/app/            puslapiai ir API maršrutai ((app) – po prisijungimo, (auth) – prisijungimas, d/ – kliento nuoroda)
src/components/     komponentai (admin/, documents/, estimates/, notifications/, marketing/)
src/lib/            verslo logika (work, admin, cars, estimates, documents, notifications, telegram, auth, supabase)
src/middleware.ts   prisijungimo apsauga ir viešų kelių sąrašas
supabase/migrations duomenų bazės migracijos
supabase/tests/     duomenų bazės testai (run.sh, rls_test.sql, documents_test.sql)
tests/              vienetiniai testai (unit/) ir naršyklės testai (e2e/)
docs/               išsamūs dokumentai kiekvienai sričiai
.github/workflows/  ci.yml (testai) ir car-reminders.yml (kasdienis priminimas)
```

Laiko juosta: visos datos skaičiuojamos pagal `Europe/Vilnius` (`src/lib/dates.ts`). Prekės ženklas: `src/components/Logo.tsx`, ikonos `public/icons/`, spalvos `tailwind.config.ts`. Pardavimo puslapis (`/`) matomas neprisijungus, kainos ir funkcijų sąrašas: `src/lib/plans.ts`, `src/components/marketing/featureList.ts`.

## Svarbu žinoti

* Bendrus failus (`middleware.ts`, `BottomNav.tsx`, `AdminTabs.tsx`, `layout.tsx`) keiskite smulkiais pakeitimais ir prieš `git push` pasitikrinkite `git diff`. Kopijuojant visą failą galima netyčia ištrinti kitų funkcijų eilutes.
* Į Git nedėkite archyvų (`.zip`, `.7z`), `.env.local`, `.next`, `.open-next`, `.wrangler`: tai nurodyta `.gitignore`. GitHub nepriima failų, didesnių nei 100 MB.
* Privatumo politikos puslapis (`/privatumas`) yra šablonas: prieš viešai platinant įrašykite duomenų valdytojo kontaktus ir peržiūrėkite tekstą su teisininku. Sutarties šablonas taip pat yra juodraštis, ne teisinė konsultacija.
* Kasdienis automobilių priminimas (GitHub Actions) ir Telegram pranešimai veikia tik tada, kai nustatyti `CRON_SECRET`, `APP_URL` ir Telegram kintamieji.
