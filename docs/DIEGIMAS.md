# DarboRitmas: diegimas ir atnaujinimai

Programa kompiliuojama ir skelbiama automatiškai: po kiekvieno `git push` į `main` Cloudflare pats sukompiliuoja kodą ir paskelbia naują versiją. Šis dokumentas aprašo, kaip tai nustatyta, kaip saugiai atnaujinti kodą ir ką daryti, kai kas nors nepavyksta.

Visas komandas rašykite **PowerShell** lange projekto aplanke (Windows: atidarykite aplanką, adreso juostoje įrašykite `powershell` ir spauskite Enter).

## 1. Pirmas paleidimas (daroma vieną kartą)

### Supabase
1. Sukurkite projektą ir **SQL Editor** paleiskite `supabase/migrations` failus iš eilės (sąrašas ir paaiškinimas: `README.md`). Jei failas rašo „already exists“, jis jau įvykdytas.
2. **Authentication → Email**: „Confirm email“ įjungta. **URL Configuration**: Site URL ir Redirect URLs nurodykite tikrą svetainės adresą.
3. **Storage**: turi būti saugykla `attachments`.
4. **Database → Webhooks**: žr. `docs/PRANESIMAI.md`.

### Cloudflare
1. **Workers & Pages → Create → Import a repository**, pasirinkite `santechnitas-pro`.
2. **Build command:** `npx opennextjs-cloudflare build`. **Deploy command:** `npx wrangler deploy`.
3. **Settings → Variables and Secrets** įrašykite kintamuosius (lentelė `README.md`). `NEXT_PUBLIC_*` kintamuosius įrašykite ir **Build** skiltyje, nes jie įrašomi kompiliuojant.
4. Telegram ir kasdienį priminimą nustatykite pagal `docs/TELEGRAM.md` ir `docs/PRANESIMAI.md`.

### GitHub
**Settings → Secrets and variables → Actions**: `APP_URL` (svetainės adresas be `/` gale) ir `CRON_SECRET`.

## 2. Kaip saugiai atnaujinti kodą

Gavę naujus failus (ZIP iš pokalbio ar kito kompiuterio), niekada netrinkite viso projekto aplanko ir nekopijuokite ant viršaus nepatikrinę. Taip galima ištrinti kitų funkcijų eilutes.

```powershell
git status
```
Prieš pradėdami darbo medis turi būti švarus (`nothing to commit`). Jei ne, pirma išsaugokite savo darbą: `git add -A` ir `git commit -m "Prieš atnaujinimą"`.

1. Išarchyvuokite ZIP į aplanką **už projekto ribų** (pvz. `Downloads`), ne į pačią projekto vidų.
2. Nukopijuokite tik jame esančius failus į projektą (kelią pakeiskite į savo):
   ```powershell
   Copy-Item -Path "$HOME\Downloads\<ZIP-aplankas>\files\*" -Destination . -Recurse -Force
   ```
3. Patikrinkite, kas pasikeitė:
   ```powershell
   git status --short
   git --no-pager diff --stat
   ```
   Turi būti tik tie failai, kuriuos žadėjo atnaujinimo aprašas. Jei kokio nors seno failo pakeitimų skaičius gerokai didesnis nei tikėtasi, **nespauskite toliau**: tada jūsų failas buvo kitoks ir jį perrašė.
4. Tikrinkite kodą (tipai ir vienetiniai testai):
   ```powershell
   npm install
   npm run check
   ```
   Turi baigtis be klaidų. Jei jos yra, atsiųskite visą tekstą.
5. Jei yra naujų migracijų (`supabase/migrations`), paleiskite jas Supabase **SQL Editor** (po vieną, iš eilės), prieš išsiųsdami kodą.
6. Išsiųskite:
   ```powershell
   git add -A
   git commit -m "Trumpas pakeitimo aprašymas"
   git push
   ```
7. **Cloudflare → Workers & Pages → darboritmas → Deployments**: palaukite, kol naujas diegimas bus **Ready** (apie 2 minutes), tada naršyklėje paspauskite Ctrl+F5.

Jei `git push` atmeta dėl didelio failo (daugiau nei 100 MB), projekte yra archyvas (`.zip`, `.7z`): išneškite jį iš aplanko ir išvalykite commit'ą (`git reset --soft origin/main`, `git rm --cached <failas>`, `git add -A`, `git commit`).

## 3. Jei kažkas sugedo

* **Svetainė rodo senesnę versiją ar klaidą po diegimo.** Cloudflare → Deployments → paskutinė veikusi versija → **Rollback**. Tai nekeičia Git'o, todėl kitas `git push` vėl paskelbs naują versiją.
* **Diegimas „Failed“.** Atidarykite jį ir **View build log**: paskutinės eilutės parodo klaidą. Dažniausios priežastys: tipų klaida (paleiskite `npm run check`), trūkstamas `NEXT_PUBLIC_*` kintamasis Build skiltyje, `package-lock.json` neatitinka `package.json` (paleiskite `npm install` ir išsiųskite atnaujintą `package-lock.json`).
* **Vietinio darbo grąžinimas į paskutinį išsaugotą variantą** (atsargiai, ištrina neišsaugotus pakeitimus): `git restore .` ir `git clean -fd`.
* **Įkelti tiesiai iš kompiuterio (apeinant GitHub):** `npx wrangler login`, tada `npm run deploy`. Įkeliama tai, kas yra jūsų aplanke, todėl prieš tai pasitikrinkite `git status`.

## 4. Patikra po didesnio atnaujinimo (apie 15 minučių)

Reikia dviejų paskyrų: administratoriaus ir darbuotojo (antrą pakvieskite per Valdymas → Darbuotojai ir užregistruokite kitu el. paštu kitoje naršyklėje ar anoniminiame lange).

1. **Administratorius:** Valdymas → Objektai → sukurkite objektą su kliento vardu ir telefonu → įkelkite nuotrauką į kortelę.
2. Valdymas → Darbai → Naujas darbas → pasirinkite objektą ir darbuotoją.
3. **Darbuotojas:** atidarykite darbą, pradėkite ir baikite darbo laiką, parašykite „Pastaba biurui“ su medžiaga.
4. **Administratorius:** Medžiagos → pastaba turi matytis sąraše; Valdymas → Ataskaita rodo valandas.
5. **Sąmata:** apatinis meniu → Sąmata → sukurkite sąmatą. Valdymas → Dokumentai → Nauja sutartis → susiekite su sąmata → „Ruošti siuntimui“ → atidarykite nuorodą privačiame lange ir paspauskite „Patvirtinti“. Administratorius turi gauti pranešimą.
6. **Automobiliai:** Valdymas → Automobiliai → pridėkite automobilį ir priskirkite vairuotoją; vairuotojas apatiniame meniu mato „Automobiliai“.

Jei bet kuris veiksmas nepavyksta, padarykite ekrano nuotrauką ir (jei galite) paspauskite F12 → Console, nukopijuokite raudoną eilutę.
