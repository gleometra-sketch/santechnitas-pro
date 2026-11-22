# Migracijų tvarka

Paleiskite Supabase SQL Editor **pagal failo pavadinimą** (abėcėlės tvarka), kiekvieną tik vieną kartą.

- Trys failai turi numerį `0014`: `0014_checklist_templates`, `0014_notifications`, `0014_telegram`. Jie paleidžiami šia tvarka (abėcėlės), `0014_telegram` reikalauja `0014_notifications`. Nepervadinkite jų, jei jau paleisti.
- Numeriai `0017`–`0019` **sąmoningai praleisti** (jų niekada nebuvo šiame projekte). `0020_documents` tai nekliudo.
- Nauji failai pradedami nuo `0021`.

| Failas | Kam skirtas |
|---|---|
| 0001–0013 | pagrindas, darbai, medžiagos, laikas, objektų kortelė |
| 0014_* | užduočių šablonai, pranešimai, Telegram |
| 0015_cars | automobiliai |
| 0016_estimates | sąmatų skaičiuoklė (skiltis „Sąmata“) |
| 0020_documents | sąmatos ir sutartys klientui (dokumentai) |
| 0021_paddle | Paddle mokėjimų lentelės (vietoj nenaudoto Stripe) |
| 0022_plans | planai, limitai, naudojimo skaitiklis, sąmatų užrakinimas |
