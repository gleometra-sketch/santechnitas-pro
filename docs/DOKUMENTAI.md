# Sąmatos ir sutartys su klientais

Migracija: `supabase/migrations/0020_documents.sql`. Paleisti Supabase SQL Editor po `0015_cars.sql` (migracijų 0016–0019 šiame projekte nėra, jų nereikia: migracija pati sukuria pagalbinę funkciją `notify_admins`, jei jos nėra). Jai reikia anksčiau paleistų `0001`–`0003` ir `0014_notifications`.

**Aplinkos kintamieji** (Cloudflare → Variables and Secrets): `SUPABASE_SERVICE_ROLE_KEY` (viešas kliento puslapis skaito ir įrašo atsakymą per serverį) ir `NEXT_PUBLIC_APP_URL` (iš jo sudaroma nuoroda klientui; jei nenurodytas, imamas svetainės adresas iš užklausos). Skiltis: Valdymas → Dokumentai ir objekto kortelėje „Sąmatos ir sutartys“.

## Kaip tai veikia
1. **Įmonės rekvizitai** (Dokumentai → apačioje „Įmonės rekvizitai“): pavadinimas, kodas, PVM kodas, adresas, telefonas, el. paštas, IBAN. Rodomi klientui; išsiuntus dokumentą jų kopija nebesikeičia.
2. **Sąmata:** objektas (neprivaloma, užpildo kliento duomenis), eilutės (aprašymas, kiekis, mato vnt., kaina), PVM, galiojimas, pastabos. Sumas skaičiuoja serveris centais.
3. **Sutartis:** gali būti sukurta iš sąmatos (sąmata tampa sutarties priedu, kaina paimama iš jos). Tekstas kuriamas iš šablono, laukus [SKLIAUSTUOSE] užpildote ranka; prieš siunčiant programa perspėja, jei jų liko.
4. **Siuntimas:** „Išsaugoti ir ruošti siuntimui“ sukuria viešą nuorodą. Ją siunčiate patys per WhatsApp, SMS, el. paštą (mygtukai paruošti) ar nukopijuojate. Programa pati el. laiškų nesiunčia.
5. **Klientas** atidaro nuorodą (be prisijungimo), peržiūri, gali spausdinti arba išsaugoti kaip PDF ir paspausti „Patvirtinti“ (įrašo vardą ir pavardę, pažymi sutikimą) arba „Atmesti“ (su priežastimi).
6. **Pranešimai:** administratoriai (programoje ir Telegram) gauna pranešimą, kai dokumentas išsiųstas (kitiems administratoriams), patvirtintas, atmestas ar atšauktas. Pakartotinis „Išsaugoti ir ruošti siuntimui“ tos pačios nuorodos tik grąžina, pranešimo nekartoja ir išsaugotų rekvizitų nekeičia. Pranešimai „Sąmatos ir sutartys“ laikomi skubiais, todėl tylos valandomis nelaukia.

## Būsenos
Juodraštis → Išsiųsta → Patvirtinta / Atmesta / Atšaukta. Redaguoti galima tik juodraštį; išsiųstą galima atšaukti ir nukopijuoti kaip naują juodraštį. Ištrinti galima juodraštį, atšauktą ir atmestą dokumentą.

## Saugumas ir privatumas
- Atšauktas dokumentas klientui nebeatsiskleidžia: nuoroda rodo tik pranešimą „Šis dokumentas atšauktas“.
- Nuoroda yra slaptas atsitiktinis kodas (192 bitų); kas ją turi, gali peržiūrėti ir patvirtinti dokumentą. Siųskite tik klientui. Nuorodos puslapis neindeksuojamas paieškos sistemų.
- Patvirtinimas saugo vardą, datą, laiką ir IP adresą (kaip įrodymą). Tai asmens duomenys: pridėkite tai į privatumo politiką (`/privatumas`).
- Dokumentus mato ir tvarko tik savininkas ir administratoriai; darbuotojai jų nemato.
- Šis paprastas elektroninis patvirtinimas nėra kvalifikuotas elektroninis parašas. Ar jis tinka jūsų sutartims, aptarkite su teisininku. Sutarties šablonas yra juodraštis ir nėra teisinė konsultacija.

## Testai
- `npm test` tikrina sumų, sutarties šablono ir nuorodų logiką (`tests/unit/documents.test.ts`).
- `supabase/tests/run.sh` (PostgreSQL 15+) paleidžia visas migracijas ir `documents_test.sql`: teisės, kitų įmonių izoliacija, sumos, siuntimas, kliento atsakymas, atšaukimas, galiojimas, pranešimai.

## Kol kas nepadaryta
- Tikras PDF failas serveryje (naudojamas naršyklės „Spausdinti / PDF“).
- Priminimas klientui, kai artėja galiojimo pabaiga, ir sąskaitos faktūros.
- Plano (pakopos) apribojimai: modulis prieinamas visiems, kol nenustatyti planai.
