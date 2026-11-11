# DarboRitmas – programos auditas (vizijos dokumento 12 skyrius)

Data: 2026-11-09. Atnaujinta: RLS testai (0001–0008) praėjo pas naudotoją; A1 ir M3 taisomi migracija 0009. Auditas statinis: perskaitytas visas kodas, SQL migracijos ir RLS politikos. **Programa nebuvo paleista naršyklėje ir nebuvo prijungta prie Supabase**, todėl visi vykdymo (runtime) punktai pažymėti BLOCKED.

## 1. Apimtis ir apribojimai

| Klausimas | Atsakymas |
|---|---|
| Ką tikrinau | Kopiją iš paskutinio ZIP (visi 6 etapo pakeitimai, laikas pagal objektą, prekės ženklas). |
| GitHub repozitorija | Atsisiųsti negalėjau (aplinkoje nėra tinklo). Puslapis rodo skirtumą: README jūsų repozitorijoje mini `featureList.ts`, o mano kopijoje failas `features.ts`. Tikėtina, kad repozitorija ir mano kopija jau išsiskyrė – **patikrinkite, ar jūsų lokali versija sutampa su GitHub**. |
| Sintaksė | Visi `.ts` ir `.tsx` failai praėjo TypeScript sintaksės patikrą (0 klaidų). |
| Pilnas `typecheck` | NEATLIKTAS: aplinkoje nėra `next`, `react`, `@types/react`. Likę 3 pranešimai buvo dirbtiniai (dėl trūkstamų tipų). Paleiskite `npm run typecheck` pas save. |
| `next build`, naršyklė, mobilusis | BLOCKED. |
| SQL / RLS testai | BLOCKED (nėra PostgreSQL). Testai yra `supabase/tests/rls_test.sql`, paleidžiami `./supabase/tests/run.sh`. |
| Slaptieji raktai | Kode raktų nėra. `.env.local` yra `.gitignore`. Į kodą nepatenka `SERVICE_ROLE` ir `STRIPE` raktai (jie tik `.env.example`). |

## 2. Inventorius

- **Puslapiai (17):** `/`, `/prisijungimas`, `/registracija`, `/pamirsau-slaptazodi`, `/naujas-slaptazodis`, `/auth/callback`, `/kurti-imone`, `/privatumas`, `/nesukonfiguruota`, `/darbai`, `/kalendorius`, `/valandos`, `/medziagos`, `/valdymas` (+ `darbai`, `objektai`, `darbuotojai`, `laikas`).
- **Serverio veiksmai:** 38 (darbuotojo 16, administratoriaus 16, prisijungimo 6).
- **Lentelės (17):** profiles, companies, company_members, trial_claims, subscriptions, payments, stripe_events, projects, tasks, task_checklist_items, time_entries, breaks, days_off, notes, attachments, material_requests, material_request_items.
- **Migracijos:** 0001–0008. **Testai:** tik SQL/RLS ir `api_check.mjs`; vienetinių, E2E testų ir CI nėra.

## 3. Funkcijų matrica

Statusai: **PASS** (kode atrodo teisingai, vykdymas nepatikrintas) · **PARTIAL** · **FAIL** (rastas defektas) · **MISSING** (neįgyvendinta) · **BLOCKED** (nepatikrinta aplinkos riboti).

| Sritis | Funkcija | Statusas | Pastaba |
|---|---|---|---|
| Prisijungimas | Registracija, prisijungimas, atsijungimas, slaptažodžio atkūrimas | PASS | Vykdymas BLOCKED. `next` nukreipimas sanitizuotas (apsauga nuo atviro redirect). |
| Prisijungimas | Rolės (owner/admin/worker), puslapių apsauga | PASS | Middleware + serverio patikra + RLS. |
| Prisijungimas | Kvietimai pagal el. paštą | PASS (sąlyga) | Veikia tik jei Supabase įjungtas **„Confirm email“** (žr. radinį M1). |
| Objektai | Kūrimas, redagavimas, archyvavimas | PASS | |
| Objektai | Trynimas, paieška, filtrai, rikiavimas, puslapiavimas | MISSING | Tik archyvavimas. |
| Objektai | Klientas (vardas, telefonas, el. paštas) | PASS po 0013 | Terminas ir atsakingas asmuo – MISSING. |
| Darbai | Kūrimas, priskyrimas, data, punktų sąrašas, redagavimas, trynimas | PASS | |
| Darbai | Būsenos, data, užbaigimas darbuotojui | PASS | |
| Darbai | Pasikartojantys darbai, prioritetai, terminai | MISSING | |
| Kalendorius | Mėnuo/savaitė, perkėlimas, darbai be datos | PASS | |
| Valandos | Pradėti, pertrauka, tęsti, baigti, nedarbo diena | PASS | |
| Valandos | Laikas pagal objektą, režimas įmonei ir darbuotojui, perjungimas | PASS | Migracija 0008 dar nebuvo paleista duomenų bazėje. |
| Valandos | Administratoriaus taisymas, pridėjimas, trynimas | PASS | |
| Valandos | Valandų vientisumas serveryje | PASS po 0009 | Radinys A1 ištaisytas migracija 0009 (paleiskite testus). |
| Valandos | Valandų patvirtinimas | PASS po 0012 | Migracija 0012, žr. `docs/OBJEKTAS.md`. |
| Valandos | Tarifai administratoriui, ataskaita | PASS po 0011 | Viršvalandžiai ir priedai nerealizuoti. |
| Valandos | Ataskaita visiems darbuotojams / pagal objektą, eksportas | MISSING | CSV pašalintas pagal prašymą; administratoriui ataskaitos nėra. |
| Medžiagos | Užsakymas, administratoriaus sąrašas, filtrai, „Nupirkta“, grąžinimas, redagavimas | PASS | Eilutės redagavimas vykdomas kliente, vykdymas BLOCKED. |
| Medžiagos | Kainos, tiekėjai, medžiagų katalogas | MISSING | |
| Failai | Nuotraukos, dokumentai prie objekto ir darbo | PASS po 0013 | Vykdymas BLOCKED (reikia Supabase Storage). |
| Pastabos | Pastaba biurui (tekstas, diktavimas) | PASS | Garso įrašo saugojimo nėra. |
| Dokumentai | Sąmatos, sąskaitos (atidėta), PDF | MISSING | |
| Pranešimai | Push / el. paštas | MISSING | |
| Prenumeratos | Stripe/Paddle, planų ribojimas | MISSING | Lentelės yra, kodo nėra. |
| Pardavimo puslapis | `/` ir CTA į registraciją | PASS | Kainos „netrukus“. |
| Archyvas / „soft delete“ | | PARTIAL | Objektai ir darbuotojai archyvuojami, darbai ištrinami visam laikui. |

## 4. Radiniai pagal rimtumą

### Aukštas
**A1. Darbo laiko vientisumas nebuvo užtikrintas serveryje (ištaisyta migracija `0009_time_integrity.sql`).** `time_entries` politikos leidžia darbuotojui: (a) įterpti savo įrašą su bet kokiu `started_at` / `ended_at`; (b) pakeisti savo neužbaigto įrašo `started_at`. Nėra jokio gynimo trigerio (`time_entries` turi tik `updated_at`). Naršyklės mygtukai laikus siunčia teisingai, bet tiesioginė užklausa į Supabase API gali pridėti ar pailginti valandas. Tai svarbu, nes jūsų pagrindinė vertė yra valandų apskaita ir mokėjimai.
*Siūlomas taisymas:* migracija 0009 – trigeriai `time_entries` ir `breaks`: ne administratoriui `started_at` visada `now()`, `ended_at` leidžiamas tik `now()` (± kelios sekundės), `user_id`, `company_id`, `started_at` nekeičiami po sukūrimo; ta pati taisyklė pertraukoms. Administratorius galimybių nepraranda.

### Vidutinis
- **M1. Kvietimų saugumas priklauso nuo Supabase nustatymo.** `claim_invitations` reikalauja patvirtinto el. pašto, bet jei Supabase projekte išjungtas „Confirm email“, bet kas gali užsiregistruoti svetimu el. paštu ir perimti pakvietimą. *Veiksmas:* patikrinkite Authentication → Providers → Email → „Confirm email“ įjungta.
- **M2. (ištaisyta migracija 0010 ir programoje) Neuždarytas laikmatis.** Jei darbuotojas pamiršta „Baigti“, įrašas lieka atviras (kitą dieną rodoma milžiniška trukmė, valandų suvestinė išpučiama), automatinio uždarymo ar įspėjimo nėra. Rizika didelė realiame darbe. *Siūlymas:* įspėjimas ir administratoriaus „Užbaigti“ mygtukas sąraše; neuždarytų įrašų riba (pvz. 16 val.).
- **M3. (ištaisyta 0009) Užduočių sąrašo punktus darbuotojas galėjo keisti plačiau nei reikia.** Politika leidžia atnaujinti bet kurį stulpelį (pavadinimą, poziciją), ne tik `is_done`. *Taisymas:* trigeris, ne administratoriui leidžiantis keisti tik `is_done`.
- **M4. Darbo pabaigos nebuvimas „po vidurnakčio“.** Įrašas priskiriamas pradžios dienai; pamainos per vidurnaktį nesidalija. Tinka daugumai, bet reikia žinoti.
- **M5. Archyvavimas vs trynimas.** Darbai ištrinami negrįžtamai (su patvirtinimu), istorijos nelieka.

### Žemas
- L1. `create_company` galima kviesti kelis kartus – papildomos įmonės be bandymo, bet be ribos (užteršia duomenis).
- L2. Sąrašai ribojami (300/500), puslapiavimo nėra.
- L3. Nėra apsaugos nuo per dažnų užklausų programos lygyje (naudojamas tik Supabase ribojimas).
- L4. Nėra saugumo antraščių (CSP ir kt.) `next.config.mjs`.
- L5. `revalidatePath("/", "layout")` po kiekvieno darbuotojo veiksmo perpiešia visą puslapį – veikia, bet lėtina.
- L6. README ir GitHub gali skirtis nuo šios kopijos (žr. 1 dalį).

## 5. Darbų planas (siūlomas)

| Eil. | Darbas | Dydis | Rizika |
|---|---|---|---|
| 1 | Jūs: `npm install`, `npm run typecheck`, `npm run build`, migracijos 0001–0008, `./supabase/tests/run.sh`; patikrinti „Confirm email“ | 1–2 val. | – |
| 2 | **Migracija 0009: valandų vientisumas (A1) + punktų ribojimas (M3)** su SQL testais | maža | maža, bet keičia laiko taisykles |
| 3 | Neuždaryto laikmačio apsauga (M2) | maža | maža |
| 4 | Administratoriaus ataskaita: visi darbuotojai × mėnuo, pagal objektą, su įkainiais ir eksportu | vidutinė | vidutinė (nauji duomenys: įkainiai) |
| 5 | Valandų patvirtinimas (draft → patvirtinta) | vidutinė | vidutinė (keičia srautą) |
| 6 | Objekto kortelė: klientas, nuotraukos/failai (Storage jau paruoštas) | vidutinė | maža |
| 7 | Automatiniai testai (Playwright E2E su testine DB) ir CI | vidutinė | maža |
| 8 | Planų ribojimas ir mokėjimai | didelė | didelė – atskirai |

**Prašomas patvirtinimas:** 2 žingsnis (migracija 0009) keičia, kaip duomenų bazė priima laikus. Prieš diegiant ją reikėtų leisti RLS testus pas jus.
