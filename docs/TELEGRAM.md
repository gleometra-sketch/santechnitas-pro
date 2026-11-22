# Telegram pranešimai administratoriams

Botas siunčia **tik įmonės administratoriams** (savininkui ir administratoriams) pranešimus iš programos.
Darbuotojai botui neprijungiami.

## Kokie pranešimai veikia dabar

| Kategorija | Kada ateina |
|---|---|
| `medziagos` | Darbuotojas išsiunčia medžiagų poreikį |
| `pastabos` | Darbuotojas parašo pastabą biurui |
| `darbas` | Darbuotojas pradeda, baigia darbą arba pakeičia objektą |
| `automobiliai` | Automobilio terminai (TA, kelių mokestis, draudimas) ir tepalų keitimas |
| `dokumentai` | Sąmata ar sutartis išsiųsta (kitam administratoriui), klientas patvirtino, atmetė arba dokumentas atšauktas |

Paties veiksmo autorius pranešimo negauna (jei administratorius pats pradeda darbą, jam nerašoma).
Kiekvienas administratorius gali išjungti kategorijas botui parašęs `/isjungti darbas`.

Dokumentų pranešimai (`dokumentai`) siunčiami per pranešimų eilę (`document_status`, žr. `DOKUMENTAI.md`); jų reikia nustatyti Supabase webhook (`PRANESIMAI.md`). Rankinio `daily_digest`, `work_reminder`, `hours_missing`, `weekly_hours` siuntimo kodo dar nėra, todėl nustatymuose jie nerodomi.

**Planai ir limitai:** Telegram prieinamas Pro ir Verslui planuose. Pro turi 300 žinučių per mėnesį (viena žinutė vienam administratoriui); pasiekus 80 % sustoja darbo pradžios / pabaigos žinutės, pasiekus 100 % visos. Programos varpelis veikia visada. Žr. `SAMATOS-IR-PLANAI.md`.
Naują kategoriją pridėkite į `src/lib/telegram/core.ts`, o žinutę siųskite per `notifyAdmins(...)` arba per pranešimų eilę (`docs/PRANESIMAI.md`).

## Diegimas (vieną kartą)

### 1. Duomenų bazė
Supabase → SQL Editor: paleiskite `supabase/migrations/0014_telegram.sql`.

### 2. Slaptieji kintamieji
Sugalvokite ilgą atsitiktinę eilutę (tik `A-Z a-z 0-9 _ -`) kaip `TELEGRAM_WEBHOOK_SECRET`.
Programa veikia Cloudflare, todėl slaptuosius kintamuosius įrašykite taip:

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY   # jei dar neįrašytas
```

`TELEGRAM_BOT_USERNAME` (be @) nėra slaptas, jį galite įrašyti į `wrangler.jsonc` → `"vars"` arba Cloudflare skydelyje.
Vietoje (`npm run dev`) naudokite `.env.local` pagal `.env.example`.

Po pakeitimų: `npm run deploy` (pirma sukompiliuoja programą, tada įkelia į Cloudflare). Jei diegiate per Cloudflare Git integraciją, skiltyje Settings → Build nurodykite Build command `npm run cf:build` ir Deploy command `npx wrangler deploy`; kitaip bus įkeliamas senas `.open-next` aplankas.

### 3. Webhook'o užregistravimas
Telegram turi žinoti jūsų adresą. Vykdykite (pakeiskite trys reikšmės):

```bash
curl -sS "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://<JUSU-DOMENAS>/api/telegram/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>" \
  -d 'allowed_updates=["message"]'
```

Atsakymas turi būti `{"ok":true,...}`. Būseną galima pažiūrėti: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
(laukas `last_error_message` parodo, jei Telegram nepasiekia adreso).

### 4. Prijungimas programoje
Prisijunkite kaip administratorius → **Valdymas → Telegram → Prijungti Telegram** → atsidariusiame Telegram paspauskite **Start**.
Nuoroda vienkartinė ir galioja 15 minučių.

## Botas
Komandos: `/pranesimai`, `/isjungti <kategorija>`, `/ijungti <kategorija>`, `/atsijungti`, `/pagalba`.
Botas atsako tik privačiuose pokalbiuose (grupėse nieko neprijungia).

## Saugumas
- Webhook priima tik užklausas su teisinga `X-Telegram-Bot-Api-Secret-Token` antrašte.
- Prijungimo kodai vienkartiniai, galioja 15 min., duomenų bazėje saugoma tik jų SHA-256 maiša.
- Vaidmuo tikrinamas ir prijungiant, ir kiekvieną kartą siunčiant: nebe administratorius pranešimų negauna.
- `telegram_links` ir `telegram_link_tokens` keičia tik serveris (`service_role`); naršyklė mato tik savo prijungimą.
- Jei vartotojas užblokuoja botą, prijungimas automatiškai pašalinamas.
- Žinutėse naudotojų įvestas tekstas apsaugotas nuo HTML interpretavimo.

## Du siuntimo keliai (abu tik administratoriams)
- **Tiesioginis:** `src/lib/telegram/notify.ts` (`notifyAdmins`), kviečiamas iš `src/lib/work/actions.ts`: medžiagos, pastabos, darbo pradžia ir pabaiga.
- **Per pranešimų eilę:** automobilių terminai ir kiti įvykiai eina per `notification_outbox` → `notify()` → Telegram adapteris
  (`src/lib/notifications/adapters/telegram.ts`). Jis siunčia tik tiems, kas prijungti lentelėje `telegram_links`, ir vaidmuo tikrinamas kiekvieną kartą.

Telegram prijungimas yra vienas (`telegram_links`, skiltis Valdymas → Telegram). Darbuotojai Telegram neprijungiami.

## Senasis Python botas
Atskiras `bot.py` (kuris buvo sukurtas pirmame pokalbyje) šiai programai nebereikalingas: webhook veikia pačioje programoje.
