# Testavimas

Trys automatiniai sluoksniai ir trumpas rankinio patikrinimo sąrašas tam, ko automatiniai testai neapima.

| Sluoksnis | Ką tikrina | Komanda | Kur veikia |
|---|---|---|---|
| **Vienetiniai testai** | Datos (Lietuvos laikas, laiko kaitos dienos), pinigai, ataskaitos skaičiavimas (įkainių istorija, užšaldymas), CSV, failų tipai, apsauga nuo svetimų nukreipimų | `npm test` | kompiuteryje ir CI, trunka kelias sekundes |
| **Duomenų bazė** | Visos migracijos ir apie 120 saugumo (RLS) patikrų: kas ką mato, ką gali keisti, užrakinimai, įkainių privatumas | `npm run test:db` arba Docker (žr. žemiau) | PostgreSQL, CI |
| **Naršyklė („dūmų“)** | Pardavimo puslapis, nuorodos, prisijungimo puslapiai, apsauga neprisijungus (visi `/valdymas/*`, `/darbai` ir kt. nukreipia į prisijungimą), CSV neatiduodamas, telefone nėra horizontalaus slinkimo, manifestas ir ikonos | `npm run build` ir `npm run e2e` | kompiuteris ir telefono dydis, CI |

`npm run check` paleidžia tipų patikrą ir vienetinius testus.

## Pirmas kartas
```bash
npm install            # įdiegia ir naujus įrankius (tsx, @playwright/test)
npx playwright install chromium   # tik naršyklės testams, vieną kartą
npm run check
```
Po `npm install` atsinaujina `package-lock.json`, **įkelkite jį į GitHub**. Tada `.github/workflows/ci.yml` galima pakeisti `npm install` į `npm ci`.

## Duomenų bazės testai su Docker
Žr. ankstesnę instrukciją: paleiskite `postgres:16` konteinerį su aplanku `/work` ir vykdykite `supabase/tests/run.sh` konteineryje. Matysite `PASS` eilutes ir `VISI TESTAI PRAĖJO`. Testai kuria laikiną duomenų bazę `santechnitas_test`, tikros Supabase jie neliečia.

## Naršyklės testai
```bash
npm run build
npm run e2e
```
Testai paleidžia programą (`npm run start`, prievadas 3100) ir tikrina ją kaip lankytojas. Jie **nesijungia prie Supabase** (neprisijungusio naudotojo užklausoms Supabase nereikia), todėl galima naudoti ir tikrus raktus iš `.env.local`.

## Automatinis paleidimas GitHub'e
Failas `.github/workflows/ci.yml` kiekvieno „push“ ir „pull request“ metu paleidžia dvi užduotis: **Programa** (tipai, vienetiniai testai, build, naršyklės testai) ir **Duomenų bazė** (migracijos ir RLS testai). Rezultatus matysite repozitorijos skiltyje **Actions** (žalia varnelė arba raudonas kryželis). Nepavykus naršyklės testams, ataskaita saugoma kaip artefaktas.

Rekomenduojama GitHub'e: Settings → Branches → apsaugoti `main`, reikalauti praeinančių CI užduočių prieš sujungiant.

## Ko automatiniai testai kol kas neapima
- **Prisijungusio naudotojo srautai naršyklėje** (darbo pradžia, medžiagų užsakymas, patvirtinimas ir t. t.) reikalauja Supabase aplinkos (vietinės `supabase start` arba atskiro testinio projekto) ir testinių paskyrų. Tai kitas žingsnis. Kol kas šiuos srautus saugo: duomenų bazės taisyklių testai (kas leidžiama ir uždrausta) ir vienetiniai skaičiavimų testai.
- Failų įkėlimas į Supabase Storage, el. laiškai, mokėjimai.
- Vizualinis patikrinimas (išvaizda). Naršyklės testai tikrina tik struktūrą ir ekrano perpildymą.

## Rankinio patikrinimo sąrašas po didesnių pakeitimų (apie 15 min.)
1. **Darbuotojas (telefone):** prisijungti, pradėti darbą (pasirinkti objektą, jei įjungta), pertrauka, tęsti, perjungti objektą, baigti; pridėti nuotrauką prie darbo; užsakyti 2 medžiagas.
2. **Administratorius:** sukurti objektą su klientu, įkelti failą, sukurti darbą darbuotojui, pažymėti medžiagą „Nupirkta“, nustatyti įkainį, atidaryti Ataskaitą, patvirtinti praėjusį mėnesį ir pabandyti pakeisti to mėnesio įrašą (turi neleisti), atšaukti patvirtinimą, atsisiųsti CSV.
3. **Atskiri langai:** su darbuotojo paskyra bandyti atidaryti `/valdymas` ir `/medziagos` (turi nukreipti).

## Kaip pridėti testą
- Naujai skaičiavimo funkcijai: failas `tests/unit/<pavadinimas>.test.ts` (naudojamas `node:test`; importuokite per santykinį kelią, pvz. `../../src/lib/...`). Funkcija turi būti gryna (be Supabase), kitaip ją reikia išskirti kaip `src/lib/admin/reportCalc.ts`.
- Naujai duomenų bazės taisyklei: pridėkite skyrių į `supabase/tests/rls_test.sql` (`t.as_user('A')`, `t.err(...)`, `t.ok(...)`).
- Naujam viešam puslapiui: pridėkite atvejį į `tests/e2e/smoke.spec.ts`.
