# DarboRitmas

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
| 6. Administratoriaus aplinka ir Medžiagos | Atlikta (žr. `docs/ADMINISTRATORIUS.md`, `docs/MEDZIAGOS.md`) |
| 7. Stripe prenumeratos | Laukia |
| 8. Testavimas | Laukia |
| 9. Publikavimas Vercel | Laukia |

## Svarbu

- Nuo 4 etapo reikia Supabase raktų `.env.local` (be jų rodomas nustatymų puslapis). Darbuotojo ekranai naudoja tikrus Supabase duomenis. Darbus, objektus ir darbuotojus tvarko administratorius (antraštėje „Valdymas“).
- Valandinis įkainis saugomas naršyklėje (`localStorage`).
- Laiko juosta: visos datos skaičiuojamos pagal `Europe/Vilnius` (`src/lib/dates.ts`).
- Prekės ženklas: logotipas `src/components/Logo.tsx` (šviesus ir tamsus variantas), programėlės ikonos `public/icons/`, spalvos `tailwind.config.ts`, šriftai Inter ir Space Grotesk (`src/app/layout.tsx`).
- Pardavimo puslapis (`/`) matomas neprisijungus; prisijungęs naudotojas nukreipiamas į Darbus. Funkcijų sąrašas: `src/components/marketing/featureList.ts` (atnaujinkite pridėję naują funkciją). Kainos ir limitai: `src/lib/plans.ts`.
- Tikrų raktų į kodą nerašyti. Naudokite `.env.local` pagal `.env.example`.

## Greitis
- `npm run dev` kompiliuoja kiekvieną puslapį pirmą kartą atidarius, todėl lėtas. Tikrą greitį parodys `npm run build` ir `npm run start`.
- Kiekviena užklausa kreipiasi į Supabase. Projektą kurkite arčiausiai vartotojų esančiame regione (Lietuvai – Frankfurt, `eu-central-1`); regionas keičiamas tik kuriant projektą.
