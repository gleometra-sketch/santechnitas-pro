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
| 5. Darbuotojo funkcijos su tikrais duomenimis | Atlikta (žr. `docs/DARBUOTOJAS.md`) |
| 6. Administratoriaus aplinka ir Medžiagos | Laukia |
| 7. Stripe prenumeratos | Laukia |
| 8. Testavimas | Laukia |
| 9. Publikavimas Vercel | Laukia |

## Svarbu

- Nuo 4 etapo reikia Supabase raktų `.env.local` (be jų rodomas nustatymų puslapis). Darbuotojo ekranai naudoja tikrus Supabase duomenis. Darbus kol kas gali sukurti tik administratorius (6 etapas); kol jo nėra, juos galima įrašyti rankiniu būdu SQL Editor.
- Valandinis įkainis saugomas naršyklėje (`localStorage`).
- Laiko juosta: visos datos skaičiuojamos pagal `Europe/Vilnius` (`src/lib/dates.ts`).
- Logotipas: animuotas, `src/components/AnimatedLogo.tsx`; failai `public/brand/` (logo-intro.mp4/.webm, logo-poster.webp). Norėdami pakeisti animaciją, pakeiskite šiuos failus.
- Tikrų raktų į kodą nerašyti. Naudokite `.env.local` pagal `.env.example`.
