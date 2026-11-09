# Duomenų bazė (3 etapas)

Supabase PostgreSQL su Row Level Security (RLS). Visos migracijos yra `supabase/migrations/`.

## 1. Sukurkite Supabase projektą
1. Eikite į https://supabase.com, sukurkite paskyrą ir **New project**. Pasirinkite ES regioną (pvz. Frankfurt) dėl GDPR.
2. Išsaugokite duomenų bazės slaptažodį.

## 2. Pritaikykite migracijas

**Paprasčiausias būdas (SQL Editor):** Supabase skydelyje atidarykite **SQL Editor** → **New query**, įklijuokite kiekvieno failo turinį ir paspauskite **Run**. Vykdykite iš eilės:

1. `0001_foundation.sql`
2. `0002_billing.sql`
3. `0003_work.sql`
4. `0004_materials.sql`
5. `0005_storage.sql`

**Arba su Supabase CLI** (jei naudojate): `supabase link --project-ref <ref>` ir `supabase db push`.

Kiekviena migracija vykdoma tik vieną kartą. Jei kuri nors parodo klaidą, nepaleiskite kitų ir atsiųskite man klaidos tekstą.

## 3. Raktai
Supabase → **Project Settings → API**. Reikšmes įrašykite į `.env.local` (pagal `.env.example`). `SUPABASE_SERVICE_ROLE_KEY` niekada nenaudokite naršyklėje ir nekelkite į Git.

## 4. Autentifikacijos nustatymai (4 etapui)
Supabase → **Authentication → Providers → Email**: palikite įjungtą **Confirm email**. Pakvietimai priimami tik patvirtintam el. paštui.

## Lentelės
| Lentelė | Paskirtis |
|---|---|
| profiles | Naudotojai (kuriami automatiškai po registracijos) |
| companies | Įmonės, bandymo pabaiga |
| company_members | Nariai: savininkas / administratorius / darbuotojas; pakvietimai el. paštu |
| projects | Objektai (pavadinimas, adresas, užsakymo Nr.) |
| tasks, task_checklist_items | Darbai ir jų užduočių sąrašas (pvz. 0/17) |
| time_entries, breaks, days_off | Darbo laikas, pertraukos, „šiandien nedirbu“ |
| notes, attachments | Pastabos biurui, failai (nuotraukos, balso įrašai) |
| material_requests, material_request_items | Medžiagų poreikiai ir pirkimai |
| subscriptions, payments, stripe_events | Stripe prenumeratos, mokėjimai, webhook idempotencija |
| trial_claims | Apsauga nuo pakartotinio nemokamo bandymo |

Papildomos (ne iš pradinio sąrašo): `task_checklist_items`, `days_off`, `stripe_events`, `trial_claims`, `material_requests`, `material_request_items`.

## Svarbiausios taisyklės
- **Įmonių izoliacija:** kiekviena lentelė turi `company_id`; sudėtiniai raktai neleidžia susieti įrašų tarp įmonių.
- **Darbuotojas** mato tik jam paskirtus darbus, savo laiką, pastabas ir medžiagų prašymus. **Administratorius** mato visą įmonę.
- **Prieiga:** rašyti galima tik kai `company_has_access()` yra tiesa (14 dienų bandymas, aktyvi / `trialing` / `past_due` prenumerata arba nemokama prieiga). Pasibaigus – skaityti galima, duomenys neištrinami.
- **Bandymas:** `create_company()` suteikia 14 dienų tik pirmą kartą tam pačiam (normalizuotam) el. paštui. Klientas negali pats pakeisti `trial_ends_at` ar `complimentary`.
- **Prenumeratas ir mokėjimus** rašo tik serveris (`service_role`) per Stripe webhook.
- **Laikas:** įrašai saugomi `timestamptz`; diena skaičiuojama pagal `Europe/Vilnius` (`vilnius_date()`, vaizdas `time_entry_summary`).
- **Medžiagos:** „Nupirkta“ žymi tik administratorius; pirkėją ir datą įrašo serveris; viena nupirkta eilutė neuždaro kitų.

## Žinomi apribojimai
- Apsauga nuo pakartotinio bandymo remiasi el. paštu. Kas naudoja kitą el. paštą, gaus naują bandymą. Stripe kortelės žymą pridėsime 7 etape.
- Darbuotojas gali pakeisti savo dar neužbaigto darbo laiko įrašo pradžią. Administratorius mato visus įrašus.
- Tikrų Supabase vaidmenų elgsenos (pvz. `auth.uid()` per PostgREST) negalėjau išbandyti be jūsų projekto, todėl testai vyksta su imitacija. Po `db push` rekomenduoju 4 etape patikrinti prisijungimą.

## Testai
`supabase/tests/run.sh` pritaiko migracijas švarioje PostgreSQL ir vykdo 60 RLS patikrų (reikia `psql`). Jūsų Supabase projekte šių testų **nevykdykite**.
