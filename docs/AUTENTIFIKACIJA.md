# Autentifikacija (4 etapas)

## Supabase nustatymai (vieną kartą)
Supabase skydelyje:

1. **Authentication → URL Configuration**
   - **Site URL:** `http://localhost:3000` (vėliau – jūsų Vercel adresas).
   - **Redirect URLs:** pridėkite `http://localhost:3000/auth/callback` (vėliau ir `https://JŪSŲ-ADRESAS/auth/callback`).
2. **Authentication → Providers → Email:** palikite įjungtą **Confirm email**; slaptažodžio ilgį nustatykite bent **8**.
3. **Project Settings → API:** nukopijuokite `Project URL` ir `anon` (arba `publishable`) raktą į `.env.local`:

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```
Po `.env.local` pakeitimo paleiskite `npm run dev` iš naujo.

> Supabase nemokamas planas siunčia ribotą kiekį laiškų per valandą. Gamybai prijunkite savo SMTP (Authentication → SMTP Settings).

## Kaip veikia
- **Registracija:** vardas, el. paštas, slaptažodis (≥ 8) ir sutikimas su privatumo politika. Banko kortelė nereikalinga. Išsiunčiamas patvirtinimo laiškas.
- **Prisijungimas:** po jo automatiškai priimami laukiantys pakvietimai (`claim_invitations`), tik patvirtintam el. paštui.
- **Pirmas kartas:** jei naudotojas neturi įmonės, nukreipiamas į „Sukurkite įmonę“ (`create_company`): tampa savininku ir gauna 14 dienų bandymą (tik pirmą kartą tam el. paštui).
- **Apsauga:** `middleware.ts` nukreipia neprisijungusius į `/prisijungimas`; `(app)/layout.tsx` papildomai tikrina sesiją, narystę ir prieigą **serveryje** (`company_has_access`). Nieko nepasitikima iš naršyklės.
- **Pasibaigus bandymui:** rodomas pranešimas su planais (administratoriui) arba pranešimas susisiekti su administratoriumi (darbuotojui). Duomenys neištrinami.
- **Slaptažodžio atkūrimas:** `/pamirsau-slaptazodi` → laiškas → `/naujas-slaptazodis`.

## Apribojimai
- Naudotojas, priklausantis keliems įmonėms, kol kas mato seniausią (įmonės perjungimas bus vėliau).
- Pakvietimo laiško siuntimas el. paštu bus pridėtas 6 etape su administratoriaus aplinka. Kol kas pakviestas asmuo tiesiog registruojasi tuo el. paštu, kuriuo jį pakvietė administratorius.
