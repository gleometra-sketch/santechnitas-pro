# Sąmata

Skiltis **Sąmata** (tik administratoriams; kainų darbuotojai nemato): sąmatos skaičiuoklė su medžiagų ir darbų katalogu,
kuris pildosi pats. Migracija: `supabase/migrations/0016_estimates.sql`.

## Kaip naudotis
1. **Sąmata → Nauja sąmata.** Užpildykite pavadinimą ir klientą (pasirinkus objektą, klientas ir adresas užsipildo patys).
2. **Medžiagos / Darbai / Kita:** paspauskite „Pridėti“ ir pradėkite rašyti pavadinimą. Rodomi siūlymai iš katalogo
   (paspaudus tuščią laukelį, rodomi neseniai naudoti; ieškoma pagal pradžią, žodžio pradžią ar raides, be lietuviškų ženklų: „ciau“ suranda „Čiaupas“).
3. Pasirinkus poziciją, **vienetas ir paskutinė kaina užsipildo**, o kursorius pereina į **kiekį**, kurį įvedate kiekvieną kartą (m, kg, vnt., val.).
   Vienetą ir kainą galima pakeisti. Enter kainos laukelyje pridedą naują eilutę.
4. **Sumos skaičiuojamos iškart:** eilutės, skyrių tarpinės sumos, nuolaida (%), PVM (%) ir galutinė suma; ji visada matoma apačioje.
5. **Išsaugoti** įrašo sąmatą ir **įsimena naujas pozicijas bei kainas kataloge**. Pakeitimai kas ~3 s išsaugomi ir patys (katalogas tada nekeičiamas,
   kad nesusikauptų pusiau įvesti pavadinimai), todėl išėjus nepaspaudus „Išsaugoti“ darbas nedingsta.
6. **Kopijuoti sąmatą** sukuria juodraštį su visomis eilutėmis: greičiausias būdas pradėti panašią sąmatą.
7. **Sąmata → Katalogas:** peržiūra, paieška, kainų taisymas, pozicijų pridėjimas ranka ir trynimas. Esamos sąmatos nuo katalogo pakeitimų nesikeičia.

## Skaičiavimo taisyklės
- Eilutės suma = kiekis × vieneto kaina, apvalinama iki cento (pusė – į viršų). Kiekis iki 3 skaitmenų po kablelio, kaina iki 2.
- Nuolaida taikoma tarpinei sumai, PVM – sumai po nuolaidos; abu apvalinami iki cento.
- Pinigai saugomi centais, kiekiai tūkstantosiomis, procentai šimtosiomis: nėra slankiojo kablelio paklaidų (`src/lib/estimates/calc.ts`, testai `tests/unit/estimates.test.ts`).
- Eilutė be kiekio ar kainos išsaugoma kaip 0 ir į katalogą neįsimenama (kad nepilnai užpildyta eilutė nesugadintų katalogo kainos).
- Katalogo kaina = **paskutinė išsaugota** (jei ta pati pozicija sąmatoje yra kelis kartus, laimi paskutinė eilutė). Redaguojant seną sąmatą ir paspaudus „Išsaugoti“, katalogo kaina taip pat atnaujinama.
- Didžiausia reikšmė: kiekis 100 000, kaina 1 000 000 €, 300 eilučių sąmatoje.

## Sąmatos būsenos
Juodraštis, Išsiųsta, Patvirtinta, Atmesta: kol kas žymima ranka. Numeracija automatinė: `2026-001`, `2026-002`... (atskirai kiekvienai įmonei ir metams).

## Duomenų bazė
| Lentelė / funkcija | Paskirtis |
|---|---|
| `estimates` | Sąmatos antraštė (klientas, būsena, PVM, nuolaida) |
| `estimate_lines` | Eilutės (rūšis, pavadinimas, vienetas, kiekis, kaina) |
| `estimate_catalog` | Katalogas; vienas įrašas vienam pavadinimui (be didžiųjų raidžių ir tarpų skirtumo) ir rūšiai |
| `estimate_counters` | Numeracija (rašo tik triggeris) |
| `estimate_subtotals` (view) | Tarpinė suma sąrašui |
| `save_estimate(...)` | Vienos transakcijos išsaugojimas: antraštė + eilutės + katalogas |
| `duplicate_estimate(...)` | Sąmatos kopija |

Visas lenteles mato ir keičia tik įmonės administratorius; rašyti galima tik su aktyvia prieiga (bandymas ar prenumerata). Testai: `supabase/tests/rls_test.sql`, skyrius „11. Sąmatos“.

## Galimi tolesni žingsniai
Sąmatos spausdinimas / PDF, siuntimas klientui el. paštu su patvirtinimu, medžiagų antkainis, kainų istorija, sąmatos pavertimas objekto darbais.
