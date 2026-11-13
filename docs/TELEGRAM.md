# Telegram pranešimai administratoriams

Botas siunčia **tik įmonės administratoriams** (savininkui ir administratoriams) pranešimus iš programos.
Darbuotojai botui neprijungiami.

## Kokie pranešimai veikia dabar

| Kategorija | Kada ateina |
|---|---|
| `medziagos` | Darbuotojas išsiunčia medžiagų poreikį |
| `pastabos` | Darbuotojas parašo pastabą biurui |
| `darbas` | Darbuotojas pradeda, baigia darbą arba pakeičia objektą |

Paties veiksmo autorius pranešimo negauna (jei administratorius pats pradeda darbą, jam nerašoma).
Kiekvienas administratorius gali išjungti kategorijas botui parašęs `/isjungti darbas`.

**Dar neįgyvendinta** (programoje tokių funkcijų kol kas nėra): automobilių dokumentų galiojimas
(kelių mokestis, draudimas, kasko), vairuotojų kilometražas, darbo sutarčių ir sąmatų siuntimas bei patvirtinimas.
Pranešimų sistema tam paruošta: pakanka pridėti kategoriją `src/lib/telegram/core.ts` ir iškviesti `notifyAdmins(...)`.

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

Po pakeitimų: `npm run deploy`.

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

## Senasis Python botas
Atskiras `bot.py` (kuris buvo sukurtas pirmame pokalbyje) šiai programai nebereikalingas: webhook veikia pačioje programoje.
