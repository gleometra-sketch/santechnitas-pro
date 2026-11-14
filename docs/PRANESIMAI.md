# Pranešimai: programa, Telegram, automobilių priminimai

## Kaip tai veikia
```
Veiksmas programoje ──► DB triggeris ──► notification_outbox ──► /api/notifications/dispatch ──► notify()
 (darbas priskirtas,                      (eilė, tik serveriui)    (Supabase webhook)             │
  medžiagų prašymas,                                                                              ├─► programos varpelis (notifications)
  valandos patvirtintos,                                                                          └─► Telegram (tik administratoriams)
  automobilių priminimai)
```
- **Programos varpelis** (`NotificationBell`, antraštėje): visi naudotojai. Nustatymai: `/pranesimai`.
- **Telegram**: tik administratoriai (Valdymas → Telegram), žr. `docs/TELEGRAM.md`.
- **Automobilių priminimai**: kasdien 07:00 GitHub Actions kviečia `POST /api/cars/reminders`, žr. `docs/AUTOMOBILIAI.md`.

## Slaptieji kintamieji (Cloudflare → Settings → Variables and Secrets)
| Kintamasis | Kam |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | serverio klientas (eilė, Telegram) |
| `CRON_SECRET` | apsaugo `/api/notifications/dispatch` ir `/api/cars/reminders` |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` | Telegram botas |
| `NEXT_PUBLIC_APP_URL` | nuorodos Telegram žinutėse (build metu) |

GitHub → Settings → Secrets → Actions: `APP_URL` (pvz. `https://darboritmas.gleometra.workers.dev`, be `/` gale) ir `CRON_SECRET`.

## Supabase webhook (vieną kartą)
Database → Webhooks → Create: lentelė `notification_outbox`, įvykis **Insert**, HTTP Request **POST**
`https://<DOMENAS>/api/notifications/dispatch`, antraštė `Authorization: Bearer <CRON_SECRET>`.
Kiekvienas naujas įrašas eilėje iškart išsiunčiamas. Be webhook pranešimai kaupiasi eilėje ir nesiunčiami.

## Middleware išimtys (`src/middleware.ts`)
Šie keliai neturi naudotojo sesijos, todėl yra `PUBLIC` sąraše, o patys apsaugoti slaptažodžiu:
`/api/telegram` (Telegram webhook), `/api/cars/reminders` (GitHub cron), `/api/notifications/dispatch` (Supabase webhook).
**Jei kas nors iš jų dingsta, atitinkama funkcija nustoja veikti be klaidos pranešimo (gaunamas 307 į prisijungimą).**

## Keičiant bendrus failus
`middleware.ts`, `AdminTabs.tsx`, `AppHeader.tsx`, `work/actions.ts`, `events.ts` keičia keli moduliai. Juos redaguokite tik smulkiais
pakeitimais (`git diff`, `git apply`), o ne perrašydami visu failu, ir prieš tai paleiskite `npm run check` bei `npm run test:db`.
