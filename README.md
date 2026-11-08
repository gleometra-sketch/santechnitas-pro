# SANTECHNITAS PRO

Darbo laiko, objektų ir užduočių valdymo programa (Next.js, TypeScript, Tailwind CSS).

## Paleidimas kompiuteryje

Reikia Node.js 20 arba naujesnės versijos.

```bash
npm install
npm run dev
```

Atidarykite http://localhost:3000. Telefone patikrinti galite naršyklėje atidarę kompiuterio vietinį adresą (pvz. http://192.168.x.x:3000), jei abu įrenginiai yra tame pačiame Wi‑Fi.

Kitos komandos: `npm run typecheck` (tipų tikrinimas), `npm run build` (gamybinė versija).

## Etapų būsena

| Etapas | Būsena |
|---|---|
| 1. Projekto struktūra | Atlikta |
| 2. Dizaino sistema ir pagrindiniai puslapiai | Atlikta (Darbai, Kalendorius, Valandos) |
| 3. Supabase duomenų bazė ir migracijos | Atlikta (žr. `docs/DUOMENU-BAZE.md`) |
| 4. Autentifikacija | Atlikta (žr. `docs/AUTENTIFIKACIJA.md`) |
| 5. Darbuotojo funkcijos su tikrais duomenimis | Laukia |
| 6. Administratoriaus aplinka ir Medžiagos | Laukia |
| 7. Stripe prenumeratos | Laukia |
| 8. Testavimas | Laukia |
| 9. Publikavimas Vercel | Laukia |

## Svarbu

- Nuo 4 etapo reikia Supabase raktų `.env.local` (be jų rodomas nustatymų puslapis). 1–2 etape darbų, kalendoriaus ir valandų duomenys yra **laikini maketo duomenys** (`src/lib/mock-data.ts`, adresai išgalvoti). Nuo 3 etapo juos pakeis Supabase.
- Darbo pradžios/pertraukos/pabaigos mygtukai ir pastabos kol kas veikia tik naršyklėje ir neišsaugomi.
- Valandinis įkainis saugomas naršyklėje (`localStorage`).
- Laiko juosta: visos datos skaičiuojamos pagal `Europe/Vilnius` (`src/lib/dates.ts`).
- Logotipas: `src/components/AppHeader.tsx` kol kas rodo tekstinį ženklą. Įdėkite savo failą į `public/` ir pakeiskite.
- Tikrų raktų į kodą nerašyti. Naudokite `.env.local` pagal `.env.example`.
