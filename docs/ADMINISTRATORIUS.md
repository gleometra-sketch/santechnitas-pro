# Administratoriaus aplinka (6 etapas)

Prieinama `owner` ir `admin` vaidmenims: antraštėje mygtukas **Valdymas** (`/valdymas`). Darbuotojas šių puslapių atidaryti negali (nukreipiamas į Darbus), o duomenis papildomai saugo RLS. Apatinė navigacija nesikeičia (Darbai, Kalendorius, Valandos, Medžiagos).

## Skiltys
- **Darbai** – kurti darbą (pavadinimas, aprašymas, objektas, darbuotojas, data, užduočių sąrašas), redaguoti, perskirti kitam darbuotojui, pridėti/šalinti sąrašo punktus, ištrinti. Filtrai: neužbaigti / atlikti / visi ir pagal darbuotoją. Darbuotojas darbą mato Darbuose ir Kalendoriuje.
- **Objektai** – kurti, redaguoti (pavadinimas, adresas, užsakymo nr., pastabos), archyvuoti ir atkurti. Archyvuoti objektai nesiūlomi kuriant naujus darbus.
- **Darbuotojai** – pakviesti pagal el. paštą (darbuotojas arba administratorius), keisti vaidmenį, atšaukti pakvietimą, pašalinti ir atkurti. Savininko ir savęs pašalinti ar pažeminti negalima.
- **Laikas** – pasirinkti darbuotoją ir mėnesį, pataisyti pradžią/pabaigą, pridėti praleistą įrašą, ištrinti. Laikai įvedami Lietuvos laiku.

## Ataskaita ir įkainiai
- **Darbuotojai:** prie kiekvieno darbuotojo galima nustatyti valandinį įkainį (€/val.) ir datą, nuo kurios jis galioja. Įkainį mato ir keičia tik administratoriai (lentelė `member_rates`, darbuotojai jos nemato). Pakeitus įkainį ankstesnės dienos skaičiuojamos pagal tada galiojusį.
- **Ataskaita:** mėnesio valandos ir suma kiekvienam darbuotojui, išskaidyta pagal objektą, plius visų darbuotojų suma pagal objektą. Suma yra valandos × įkainis, be mokesčių ir priedų. Jei kuriam nors laikui įkainis nenustatytas, jis neįtraukiamas ir parodomas įspėjimas.
- **Eksportas:** CSV su kabliataškiais ir kableliu (atsidaro lietuviškame Excel). Migracija: `0011_member_rates.sql`.

## Pastabos
- Pakvietimas laiško nesiunčia: darbuotojas užsiregistruoja tuo pačiu el. paštu ir jis prijungiamas automatiškai (`claim_invitations`).
- Pašalintas darbuotojas praranda prieigą, bet jo laikas, darbai ir medžiagų prašymai lieka istorijoje.
- Naujų migracijų šiam etapui nereikia (naudojamos 0001–0003 lentelės ir RLS).
- Pataisant laiką pertraukos nekeičiamos; jei pertraukų daugiau nei naujas įrašas, dirbtas laikas rodomas kaip 0.
- Laikai įvedami Lietuvos laiku, įskaitant žiemos/vasaros laiko kaitos dienas.
