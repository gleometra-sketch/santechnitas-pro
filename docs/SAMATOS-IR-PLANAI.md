# Planai, limitai ir naudojimo skaitiklis

Trys planai. Kainos eurais **be PVM**, už vieną darbuotoją (mažiausiai 3 darbuotojai); PVM prideda Paddle. Tai **pradinė hipotezė**, kurią reikia patikrinti su tikrais klientais; kainas ir limitus galima keisti (žr. „Kaip pakeisti“).

| | Bazinis | Pro | Verslui |
|---|---|---|---|
| Kaina / darbuotojui per mėn. | 3 € | 5 € | 8 € |
| Kaina / darbuotojui per metus | 30 € | 50 € | 80 € |
| Darbai, objektai, kalendorius, laikrodis, valandų patvirtinimas, darbuotojai | taip | taip | taip |
| Pastabos biurui, pranešimai programoje | taip | taip | taip |
| Naujos sąmatos ir sutartys per mėnesį | 10 | 40 | sąžiningo naudojimo riba 300 |
| Medžiagos (užsakymai, pirkimų sąrašas) | – | taip | taip |
| Automobiliai (aktyvūs) | – | 2 | 10 |
| Telegram žinutės per mėnesį | – | 300 | sąžiningo naudojimo riba 5 000 |

Bandymo laikotarpis (14 d.) = **Pro** funkcijos ir limitai. Nemokama prieiga (`complimentary`) = Verslui.

## Darbuotojų vietos

Apmokamas darbuotojų skaičius (nuo 3) yra **vietų limitas**: klientas negali pakviesti daugiau narių, nei apmokėjo.

- **Vieta** = aktyvus narys arba laukiantis pakvietimas, **įskaitant administratorius ir direktorių**. Pašalintas narys vietos neužima.
- Limitas: apmokėta prenumerata = `subscriptions.seats`; nemokamas bandymas = **10** vietų; nemokama prieiga (`complimentary`) = 1000.
- Pasiekus limitą naujo nario pakviesti ar pašalinto atkurti negalima; pranešime nurodoma, kad reikia padidinti vietas (Valdymas → Abonementas). Valdymas → Darbuotojai rodo „X / Y“ vietų.
- Taisyklė vykdoma duomenų bazės triggeriu (`company_members_seat_limit`, `0023_seats.sql`), todėl jos neapeina tiesioginės užklausos.
- **Esami nariai niekada nepašalinami automatiškai.** Jei vietų sumažinama (pvz. Paddle portale), tiesiog nebegalima pridėti naujų, kol vietų nepakanka. Apmokėtų vietų negalima pasirinkti mažiau nei dabar užimta (tikrinama keičiant planą).
- Paddle webhook atnaujina `subscriptions.seats`, todėl padidinus vietas jos iškart atsiranda.

## Dokumentų vienetas (sąmatos ir sutartys)

Skaičiuojama **vieną kartą kiekvienam dokumentui**: kai naujas dokumentas (sąmata, sutartis ar jų **kopija**) pirmą kartą išsaugomas **su turiniu** (sąmatai bent viena eilutė su pavadinimu, sutarčiai netuščias tekstas). Tai apima ir skiltį **Sąmata** (skaičiuoklė), ir **Dokumentus** (siunčiamus klientui).

Neskaičiuojama ir negrąžinama: redagavimas, siuntimas, atšaukimas, būsenų keitimas, ištrynimas, tušti juodraščiai.

Apėjimo apsauga (duomenų bazėje, `0022_plans.sql`):
- kopija yra naujas dokumentas, todėl sunaudoja naują vienetą;
- skaitiklis (`usage_events`) yra atskira lentelė be trynimo teisių, todėl ištrynus dokumentą vienetas negrįžta;
- dokumentas po išsiuntimo užrakinamas, o **skaičiuoklės sąmata pasitraukus iš juodraščio** irgi: turinio keisti ir grąžinti į juodraštį nebegalima (galima tik pakeisti būseną į patvirtinta / atmesta), pataisymams daroma kopija;
- taisyklė vykdoma triggeriais, todėl jos neapeina ir tiesioginės užklausos.

Pasiekus limitą (Bazinis, Pro): kurti naujų dokumentų nebegalima iki kalendorinio mėnesio pabaigos (Lietuvos laiku). **Visada veikia:** peržiūra, esamų juodraščių taisymas, jau suskaičiuotų dokumentų siuntimas, kliento patvirtinimas ar atmetimas, pranešimai programoje. Verslui plane riba tik įspėja.

Įspėjimai administratoriams programoje (varpelis): 80 % ir 100 % (kiekvienas po vieną kartą per mėnesį).

## Telegram vienetas

Viena sėkmingai paruošta žinutė **vienam gavėjui** (administratoriui); pavyzdys: du administratoriai × 20 pranešimų = 40. Neskaičiuojami botui rašomi atsakymai ir prijungimo patvirtinimas.

Pro (300 per mėnesį):
- iki 80 % (240) siunčiama viskas;
- nuo 80 % **darbo pradžios / pabaigos / objekto keitimo** žinutės sustabdomos (didžiausias srautas), svarbios (dokumentai, medžiagos, pastabos, automobiliai) siunčiamos toliau;
- nuo 100 % Telegram sustoja iki mėnesio pabaigos;
- administratoriai gauna įspėjimą programoje, o Valdymas → Telegram rodo naudojimą.

Verslui (5 000): žinutės nestabdomos, riba tik įspėja.

**Programos varpelis nuo Telegram limito nepriklauso.** Pastaboms biurui varpelio pranešimą kuria `notes_notify` triggeris. Darbo pradžios / pabaigos žinutės varpelio neturi (jų gali būti labai daug): kai Telegram sustoja, žiūrėkite Valdymas → Laikas.

Techninis pastebėjimas: Telegram API yra nemokamas, todėl šis limitas yra kainodaros svertas, o ne sąnaudų apsauga.

## Kur taisyklės įgyvendintos

- Duomenų bazė: `supabase/migrations/0022_plans.sql` (limitai `plan_limits`, `_company_plan`, `consume_document_unit`, triggeriai, `take_telegram_quota`, `plan_usage`).
- Programa: `src/lib/plans.ts` (planai, kainos, `planOf`), `src/lib/plans-server.ts`, `src/lib/telegram/quota.ts`, `src/components/plans/*`.
- Skilčių uždarymas pagal planą: Medžiagos ir Automobiliai (`UpgradeNotice`), Telegram prijungimas, medžiagų prašymas (serveryje). Automobilių ir dokumentų limitus papildomai vykdo duomenų bazė.
- **Žinomas apribojimas:** Medžiagų skilties uždarymas Bazinio plane vykdomas tik programos kode (puslapiai ir serverio veiksmai), ne duomenų bazėje.
- Jei DB migracijos 0022 dar nepaleistos, programa veikia kaip Pro (saugus numatytasis elgesys), o limitų nėra.

## Kaip pakeisti kainas ar limitus

1. Limitus keiskite `plan_limits` (naujoje migracijoje) **ir** `src/lib/plans.ts`; testas `tests/unit/plans.test.ts` tikrina, kad jie sutampa.
2. Kainas keiskite Paddle (naujos kainos) ir `plans.ts`; pakeiskite `PADDLE_PRICE_*` kintamuosius.
