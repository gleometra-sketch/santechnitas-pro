# Darbuotojo aplinka (5 etapas)

Visi trys ekranai naudoja tikrus Supabase duomenis; prieigą riboja RLS (žr. `DUOMENU-BAZE.md`).

## Darbai
- **PRADĖTI / pertrauka / tęsti / baigti darbą.** Laiką fiksuoja serveris, ne telefonas. Vienu metu galimas tik vienas neužbaigtas įrašas, todėl dvigubas paspaudimas nieko nesugadina. Jei užduotį pradėjote telefone, o atsidarėte kompiuteryje, rodomas tas pats laikmatis.
- **Šiandien nedirbu** (galima atšaukti).
- **Pastaba biurui:** tekstu arba diktuojant balsu (naršyklės atpažinimas, lietuvių k.). Pastabą galima pažymėti „atlikta“ arba ištrinti. Tikras garso failo įrašymas į saugyklą dar neįdiegtas.
- **Reikalingos medžiagos:** kelios eilutės (pavadinimas, kiekis, vienetas), objektas, komentaras. Prašymas išsaugomas viena atomine operacija. Matote savo prašymų būseną („Laukiama“ / „Nupirkta“).
- **Suplanuoti darbai:** Pavėluoti, Ši savaitė, Kita savaitė, Vėliau, Be datos, Atlikti. Kortelėje: pavadinimas, adresas (nuoroda į žemėlapį), užsakymo Nr., punktų progresas (pvz. 0/17). Paspaudus kortelę: užduočių sąrašas, „Pažymėti atlikta“, perkėlimas į kitą dieną.

## Kalendorius
Mėnesio ir savaitės vaizdas, darbų skaičiaus ženkliukai (užimtumas), dienos darbai, perkėlimas, skiltis „Be datos“.

## Valandos
Šiandien, ši savaitė, mėnesio suma (be pertraukų, pagal `Europe/Vilnius`), mėnesių perjungimas, mėnesių istorija (6 mėn.), atlyginimo skaičiuoklė.
Valandinis įkainis saugomas tik jūsų įrenginyje (ne serveryje).

## Kaip išbandyti
Prisijunkite kaip administratorius → antraštėje **Valdymas** → sukurkite objektą, pakvieskite darbuotoją (jis registruojasi tuo pačiu el. paštu) ir sukurkite jam darbą. Žr. `docs/ADMINISTRATORIUS.md`.

## Žinomi apribojimai
- Užbaigtų laiko įrašų darbuotojas keisti negali; pataisymus daro administratorius (Valdymas → Laikas).
- Neprisijungus (be ryšio) veiksmai neišsaugomi. Offline režimas nenumatytas.
- Laikmatis skaičiuojamas pagal serverio laiką pateikimo metu; didelis telefono laikrodžio nukrypimas gali rodyti kelių sekundžių skirtumą.
