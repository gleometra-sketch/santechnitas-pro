# DarboRitmas: kaip įdiegti atnaujinimą (instrukcija žingsnis po žingsnio)

Laikas: apie 45 minutes. Reikia: Windows kompiuterio, kuriame jau yra Node.js, Git ir Docker Desktop, ir prisijungimo prie Supabase bei GitHub.
Jūsų projekto aplankas: `C:\Users\Ryzen Gaming\Documents\GitHub\santechnitas-pro`

Visas komandas rašykite **PowerShell** lange. Jį atidarote taip: atidarykite projekto aplanką, viršuje paspauskite adreso juostą, ištrinkite tekstą, įrašykite `powershell` ir spauskite Enter. Komandas kopijuokite po vieną ir po kiekvienos spauskite Enter.

## 1 žingsnis. Atsisiųskite naują failą
Iš pokalbio atsisiųskite **darboritmas-sablonai.zip** ir padėkite į aplanką Downloads (Atsisiuntimai).

## 2 žingsnis. Padarykite atsarginę kopiją
Jei kas nors nepavyks, iš čia galėsite grįžti atgal.
```
cd "C:\Users\Ryzen Gaming\Documents\GitHub\santechnitas-pro"
git add -A
git commit -m "Atsargine kopija pries atnaujinima"
```
Jei parašo „nothing to commit“, viskas gerai, tęskite.

## 3 žingsnis. Pakeiskite failus naujais
Ši komanda ištrina **senus** projekto failus ir paliekate tik `.git` (istorija), `.env.local` (jūsų raktai) ir `node_modules`:
```
Get-ChildItem -Force | Where-Object { $_.Name -notin @(".git", ".env.local", "node_modules") } | Remove-Item -Recurse -Force
```
Dabar nukopijuokite naujus failus:
```
Expand-Archive "$env:USERPROFILE\Downloads\darboritmas-sablonai.zip" -DestinationPath "$env:TEMP\dr-new" -Force
Get-ChildItem -Force "$env:TEMP\dr-new\santechnitas-pro" | Copy-Item -Destination . -Recurse -Force
```
Patikrinkite, kad egzistuoja `src`, `supabase`, `docs` aplankai ir `package.json` failas, o `.env.local` liko vietoje:
```
dir
```

## 4 žingsnis. Įdiekite ir patikrinkite kodą
```
npm install
npx playwright install chromium
npm run check
```
Ką turėtumėte pamatyti: tipų patikra be klaidų ir `# tests 37`, `# pass 37`, `# fail 0`.
Jei pasirodo raudonos klaidos, nukopijuokite visą tekstą ir atsiųskite man.

## 5 žingsnis. Duomenų bazės testai (Docker)
Įjunkite Docker Desktop ir palaukite, kol rodo „Engine running“. Tada:
```
docker rm -f dr-test
docker run --name dr-test -e POSTGRES_PASSWORD=test -v "${PWD}:/work" -d postgres:16
```
Palaukite 10 sekundžių ir paleiskite:
```
docker exec -u postgres dr-test bash -c "cd /work/supabase/tests && tr -d '\r' < run.sh > run_unix.sh && bash run_unix.sh"
```
Ką turėtumėte pamatyti: daug eilučių su `PASS`, o pabaigoje **VISI TESTAI PRAĖJO**. Jei yra `FAIL` ar `ERROR`, atsiųskite man visą tekstą ir **nevykdykite 6 žingsnio**.
Pabaigoje: `docker rm -f dr-test`

## 6 žingsnis. Atnaujinkite tikrą Supabase duomenų bazę
Tik jei 5 žingsnyje buvo „VISI TESTAI PRAĖJO“.
1. Atidarykite supabase.com, savo projektą, kairėje **SQL Editor**, spauskite **New query**.
2. Atidarykite pirmąjį failą iš žemiau esančios lentelės (aplankas `supabase\migrations` jūsų projekte) per Notepad, nuspauskite Ctrl+A, Ctrl+C, grįžkite į Supabase, įklijuokite (Ctrl+V) ir spauskite **Run**.
3. Turi parašyti „Success“. Tada **naujam užklausos lange** tą patį su kitu failu.
4. Eikite **iš eilės** ir po vieną:

| Failas | Ką prideda |
|---|---|
| 0007_material_admin.sql | daugiau matavimo vienetų medžiagoms |
| 0008_time_mode.sql | laiko apskaita „tik valandos“ arba „pagal objektą“ |
| 0009_time_integrity.sql | valandų apsauga nuo klastojimo |
| 0010_stale_time_entries.sql | neuždaryto laikmačio riba |
| 0011_member_rates.sql | valandiniai įkainiai |
| 0012_time_approvals.sql | mėnesio valandų patvirtinimas |
| 0013_project_card.sql | objekto kortelė (klientas, failai) |
| 0014_checklist_templates.sql | užduočių sąrašų šablonai |

Jei kuri nors migracija parašo „already exists“ (jau yra), vadinasi, ji jau buvo įvykdyta anksčiau, tęskite su kita. Jei yra kita raudona klaida, **sustokite** ir atsiųskite man klaidos tekstą ir failo numerį.

Dar du patikrinimai Supabase:
- **Authentication → Sign In / Providers → Email**: **Confirm email** turi būti **įjungtas** (saugumas kvietimams).
- **Storage**: turi būti saugykla (bucket) pavadinimu **attachments**.

## 7 žingsnis. Naršyklės testai ir pirmas paleidimas
```
npm run build
npm run e2e
```
Turi parašyti, kad testai praėjo (apie 40 testų). Tada paleiskite programą:
```
npm run dev
```
Atidarykite http://localhost:3000.

## 8 žingsnis. Trumpas patikrinimas (apie 15 minučių)
Reikia dviejų paskyrų: administratoriaus ir darbuotojo (antrą galite pakviesti per Valdymas → Darbuotojai ir užsiregistruoti kitu el. paštu, kitoje naršyklėje ar anoniminiame lange).
1. **Administratorius:** Valdymas → Šablonai → paimkite „Santechnikas“ ir paspauskite „Kopijuoti ir pritaikyti“.
2. Valdymas → Objektai → sukurkite objektą su kliento vardu ir telefonu → „Atidaryti kortelę“ → įkelkite nuotrauką.
3. Valdymas → Darbai → Naujas darbas → pasirinkite objektą, darbuotoją ir **šabloną** → sukurkite.
4. **Darbuotojas:** atidarykite darbą. Turite matyti punktus pagal etapus, ženklą „Privaloma“ ir kliento telefoną.
5. Darbuotojas bando užbaigti darbą nepažymėjęs privalomų punktų: programa turi neleisti ir paaiškinti kodėl.
6. Darbuotojas pažymi privalomus punktus, prideda nuotrauką ir užbaigia darbą.
7. Darbuotojas pradeda ir baigia darbo laiką (Darbai skiltis, viršuje laikrodis).
8. **Administratorius:** Valdymas → Darbuotojai → nustatykite darbuotojui valandinį įkainį → Valdymas → Ataskaita.

Jei bet kuris veiksmas nepavyksta ar rodo klaidą, padarykite ekrano nuotrauką ir atsiųskite man.

## 9 žingsnis. Įkelkite į GitHub
```
git add -A
git commit -m "Sablonai, ataskaita, patvirtinimas, objekto kortele, testai"
git push
```
Tada GitHub puslapyje atidarykite savo repozitoriją, viršuje skiltį **Actions**. Po kelių minučių turi būti žalia varnelė. Jei raudonas kryželis: paspauskite ant jo, atidarykite nepavykusį žingsnį ir atsiųskite man tekstą.

Dar vienas dalykas: po 4 žingsnio atsinaujino `package-lock.json`, jis įkeliamas kartu (9 žingsnis). Tada galima prašyti manęs `.github/workflows/ci.yml` pakeisti iš `npm install` į `npm ci`.

## Jei kažkas sugedo, kaip grįžti atgal
Programos failus grąžina:
```
git reset --hard HEAD
git clean -fd
```
Tai grąžina būseną iš 2 žingsnio kopijos. `.env.local` neliečiamas. Supabase duomenų bazės pakeitimų tai neatšaukia: jei jau įvykdėte migracijas, nieko nedarykite ir parašykite man.

## Ką man atsakyti, kai baigsite
Parašykite trimis eilutėmis:
1. Ar `npm run check` ir duomenų bazės testai praėjo (taip ar ne, ir klaida, jei ne).
2. Kurią migraciją (numerį) paskutinę įvykdėte Supabase.
3. Ar GitHub Actions žalia, ir ką pastebėjote 8 žingsnyje.
