# Juridiniai puslapiai (Paddle domeno patvirtinimui)

Paddle prieš patvirtindamas domeną tikrina, ar viešai (be prisijungimo) yra trys dokumentai. Programoje jie jau yra:

| Puslapis | Adresas | Ką turi |
|---|---|---|
| Naudojimo sąlygos | `/salygos` | pardavėjo pavadinimas, sutikimas, leistinas naudojimas, intelektinė nuosavybė, paslaugos kokybė, mokėjimas ir prenumerata, **Merchant of Record nurodymas (Paddle)**, sustabdymas, kontaktai |
| Atšaukimas ir grąžinimai | `/grazinimai` | atšaukimas pabaigus laikotarpį, plano keitimas, **grąžinimas per 14 dienų**, kaip prašyti (paddle.net) |
| Privatumo politika | `/privatumas` | valdytojo rekvizitai, duomenys, tikslai, gavėjai (Paddle, Supabase, Cloudflare, Telegram), teisės, VDAI |

## Svarbu dėl grąžinimų

Paddle reikalauja grąžinimo laikotarpio **14–90 dienų** ir **neleidžia** „negrąžinama“ ar „visi pardavimai galutiniai“. Todėl grąžinimo politika numato **14 dienų** (`REFUND_DAYS` faile `src/lib/legal.ts`; galima padidinti iki 90). Likusią tvarką jūs išlaikote: prenumeratą galima atšaukti (galioja iki apmokėto laikotarpio pabaigos) ir keisti planą. Grąžinimus fiziškai įvykdo Paddle (jis yra pardavėjas).

## Ką turite užpildyti prieš paleidimą

Puslapiai rodo jūsų įmonės rekvizitus iš kintamųjų. Įrašykite juos į `wrangler.jsonc` `vars` (tai ne slapti duomenys) ir perdiekite:

```jsonc
"LEGAL_NAME": "UAB Jūsų įmonė",        // TIKSLUS teisinis pavadinimas (Paddle jo reikalauja)
"LEGAL_CODE": "123456789",
"LEGAL_ADDRESS": "Gatvė 1, Vilnius, LT-00000",
"LEGAL_EMAIL": "info@jusudomenas.lt",
"LEGAL_VAT": "LT123456789"             // nebūtina
```
Kol `LEGAL_NAME`, `LEGAL_ADDRESS` ar `LEGAL_EMAIL` neužpildyti, puslapiuose rodomas raudonas įspėjimas ir tuščios vietos `[ĮMONĖS PAVADINIMAS]`, `[EL. PAŠTAS]`.

## Prieš siunčiant domeną Paddle

- Puslapiai atsidaro be prisijungimo ir grąžina 200 (`/salygos`, `/grazinimai`, `/privatumas`).
- Kainų puslapyje matyti produktas ir kainos (`/#kainos`).
- Nauju domenu (rekomenduojama) pakeiskite Supabase Auth Site URL / Redirect URLs ir Paddle Default payment link bei webhook adresą.
- **Tekstus peržiūrėkite su teisininku.** Tai pagrįsti šablonai pagal Paddle minimalius reikalavimus, bet ne teisinė konsultacija. Ypač patikrinkite: atsakomybės ribojimą, duomenų tvarkytojo sutartį, saugojimo terminus ir tarptautinį duomenų perdavimą (ar tikrai taikote SCC, kokiame regione laikomas Supabase projektas).
