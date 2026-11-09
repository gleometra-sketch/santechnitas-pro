# Administratoriaus aplinka (6 etapas)

Prieinama `owner` ir `admin` vaidmenims: antraštėje mygtukas **Valdymas** (`/valdymas`). Darbuotojas šių puslapių atidaryti negali (nukreipiamas į Darbus), o duomenis papildomai saugo RLS. Apatinė navigacija nesikeičia (Darbai, Kalendorius, Valandos, Medžiagos).

## Skiltys
- **Darbai** – kurti darbą (pavadinimas, aprašymas, objektas, darbuotojas, data, užduočių sąrašas), redaguoti, perskirti kitam darbuotojui, pridėti/šalinti sąrašo punktus, ištrinti. Filtrai: neužbaigti / atlikti / visi ir pagal darbuotoją. Darbuotojas darbą mato Darbuose ir Kalendoriuje.
- **Objektai** – kurti, redaguoti (pavadinimas, adresas, užsakymo nr., pastabos), archyvuoti ir atkurti. Archyvuoti objektai nesiūlomi kuriant naujus darbus.
- **Darbuotojai** – pakviesti pagal el. paštą (darbuotojas arba administratorius), keisti vaidmenį, atšaukti pakvietimą, pašalinti ir atkurti. Savininko ir savęs pašalinti ar pažeminti negalima.
- **Laikas** – pasirinkti darbuotoją ir mėnesį, pataisyti pradžią/pabaigą, pridėti praleistą įrašą, ištrinti. Laikai įvedami Lietuvos laiku.

## Pastabos
- Pakvietimas laiško nesiunčia: darbuotojas užsiregistruoja tuo pačiu el. paštu ir jis prijungiamas automatiškai (`claim_invitations`).
- Pašalintas darbuotojas praranda prieigą, bet jo laikas, darbai ir medžiagų prašymai lieka istorijoje.
- Naujų migracijų šiam etapui nereikia (naudojamos 0001–0003 lentelės ir RLS).
- Pataisant laiką pertraukos nekeičiamos; jei pertraukų daugiau nei naujas įrašas, dirbtas laikas rodomas kaip 0.
- Pakeitus laiką dienos kaitos (žiemos/vasaros) naktį gali atsirasti 1 val. paklaida.
