# Medžiagos

## Darbuotojas
Skiltis **Darbai → Reikalingos medžiagos**: kelios medžiagos viename prašyme (pavadinimas, kiekis, vienetas), objektas, komentaras. Žemiau – „Mano prašymai“ su būsena (Laukiama / Nupirkta).

## Administratorius (owner / admin)
Meniu punktas **Medžiagos** (`/medziagos`) matomas ir atidaromas tik administratoriams; darbuotojas nukreipiamas į Darbus, o duomenis papildomai saugo RLS.

- Suvestinė: trūkstamos medžiagos, aktyvūs prašymai, šiandien pateikta, nupirkta.
- Rodiniai: Trūkstamos / Nupirktos / Visa istorija.
- Filtrai: darbuotojas, objektas, medžiaga (pavadinimo dalis), pateikimo data (nuo–iki), pirkimo būsena.
- **Nupirkta**: pirkimo datą ir administratorių įrašo DB trigeris (`material_item_before`); kitų to paties prašymo medžiagų nekeičia. **Grąžinti į sąrašą** panaikina pirkimo žymę.
- Redagavimas tiesiai eilutėje: pavadinimas, kiekis, vienetas (išsaugoma palikus lauką arba paspaudus Enter). Pateikėjas, objektas, data ir komentaras – po rodykle eilutės dešinėje.

## Duomenų bazė
Lentelės `material_requests` ir `material_request_items` (migracijos 0004, 0006, 0007). Kiekis `> 0` tikrinamas DB (`check`), serveryje (zod) ir formoje. Migracija 0007 prideda vienetus m², m³, por., ryš. ir indeksus filtrams – **ją reikia paleisti Supabase SQL Editor** (arba `supabase db push`).

## Apribojimai
- Rodoma iki 500 naujausių įrašų (siaurinkite filtrais).
- Atskiro „įgalioto biuro darbuotojo“ vaidmens nėra: teisės priklauso nuo `owner`/`admin`.
