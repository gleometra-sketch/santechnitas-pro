# Telegram pranešimai

Visi programos pranešimai (darbai, valandos, medžiagos, sąmatos, automobiliai) gali ateiti į Telegram. Numatytoji reikšmė visiems pranešimams: Telegram įjungtas, bet siunčiama tik tiems, kurie prijungė savo Telegram. Kiekvienas naudotojas gali įjungti ar išjungti atskirus pranešimus puslapyje `/pranesimai`.

## 1. Sukurkite botą
1. Telegram programėlėje atidarykite **@BotFather** ir parašykite `/newbot`.
2. Nurodykite pavadinimą (pvz. „DarboRitmas“) ir vartotojo vardą, kuris baigiasi `bot` (pvz. `darboritmas_bot`).
3. BotFather atsiųs **token**. Jo niekam neduokite ir nekelkite į Git.

## 2. Nustatymai Cloudflare (Workers → darboritmas → Settings → Variables and Secrets)
- `TELEGRAM_BOT_TOKEN` (Secret): BotFather token
- `TELEGRAM_BOT_USERNAME`: botas be `@` (pvz. `darboritmas_bot`)
- `TELEGRAM_WEBHOOK_SECRET` (Secret): išsigalvokite ilgą atsitiktinį tekstą (tik raidės, skaičiai, `_` ir `-`)
- `NEXT_PUBLIC_APP_URL`: programos adresas su `https://`, be `/` pabaigoje (naudojamas nuorodoms pranešimuose)

Po pakeitimų perdiekite programą.

## 3. Duomenų bazė
Supabase SQL Editor paleiskite `supabase/migrations/0016_telegram.sql` (po 0015).

## 4. Sujunkite botą su programa (vieną kartą)
Atsidarykite naršyklėje arba terminale (pakeiskite tris reikšmes):

```
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://<JŪSŲ_ADRESAS>/api/telegram/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>" \
  -d 'allowed_updates=["message"]'
```

Turi grįžti `"ok":true`. Būseną galima patikrinti: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`.

## 5. Prijungimas naudotojui
Programos viršuje paspauskite lėktuvėlio ikoną → **Prijungti Telegram** → atsidarys botas → **Start**. Botas patvirtins prijungimą. Atjungti galima programoje arba botui parašius `/stop`.

## Pastabos
- Jei naudotojas užblokuoja botą, kanalas automatiškai išjungiamas.
- Kasdieniai priminimai (automobiliai) ir pranešimų eilė siunčiami per `POST /api/cars/reminders` ir `POST /api/notifications/dispatch` su `Authorization: Bearer <CRON_SECRET>`.
- Tylos valandų metu išoriniai pranešimai (įskaitant Telegram) šiuo metu praleidžiami ir vėliau nesiunčiami; tai esamas projekto apribojimas (žr. TODO `notify.ts`).
