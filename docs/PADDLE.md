# Paddle mokėjimai ir planai

Trys planai (Bazinis, Pro, Verslui), kaina **už vieną darbuotoją**, kiekis nuo 3. Paddle yra pardavėjas (Merchant of Record): jis renka PVM, išrašo sąskaitas ir tvarko kortelių duomenis, mes jų nematome. Planų turinys: `SAMATOS-IR-PLANAI.md`.

## Kaip tai veikia

1. Administratorius **Valdymas → Abonementas** (arba ekrane „Bandymas baigėsi“) pasirenka planą, laikotarpį ir darbuotojų skaičių, spaudžia **Apmokėti**.
2. Serveris sukuria Paddle transakciją su įmonės ID (`startCheckout`); naršyklėje atsidaro Paddle apmokėjimo langas.
3. Paddle siunčia webhook į `/api/paddle/webhook` (parašas tikrinamas, įvykiai idempotentiški). Jis įrašo `subscriptions` (kartu su `plan_id` pagal kainos ID) ir `payments`.
4. Prieigą ir planą lemia duomenų bazės funkcijos `company_has_access` ir `_company_plan`.
5. **Pakeisti planą** (esamai prenumeratai) kreipiasi į Paddle API (`changePlan`), **Tvarkyti prenumeratą** atidaro Paddle portalą (kortelė, sąskaitos, atšaukimas).

## Nustatymas (pirmiausia SANDBOX)

1. Sukurkite Paddle **sandbox** paskyrą.
2. Supabase SQL Editor paleiskite `0021_paddle.sql`, `0022_plans.sql` ir `0023_seats.sql` (šia tvarka, po 0020).
3. Paddle → **Catalog → Products**: trys produktai (Bazinis, Pro, Verslui), kiekvienas su dviem kainomis: **1 mėn.** ir **1 m.** (3 / 30, 5 / 50, 8 / 80 €, **kaina už vieną darbuotoją**). Kiekvienai kainai leiskite **kiekį: mažiausiai 3, daugiausiai 500**.
4. Paddle → **Developer tools → Authentication**: sukurkite **API raktą** (leidimai: transakcijos, prenumeratos, klientų portalo sesijos, klientai) ir **client-side token** (`test_...`).
5. Paddle → **Developer tools → Notifications → New destination**: URL `https://JŪSŲ-ADRESAS/api/paddle/webhook`, įvykiai: `subscription.created`, `subscription.activated`, `subscription.updated`, `subscription.trialing`, `subscription.past_due`, `subscription.paused`, `subscription.resumed`, `subscription.canceled`, `transaction.completed`, `transaction.payment_failed`. Nukopijuokite **Secret key**.
6. Paddle → **Checkout → Checkout settings**: **Default payment link** nustatykite į `https://JŪSŲ-ADRESAS/valdymas/abonementas`.
7. Cloudflare Worker kintamieji (Settings → Variables and Secrets arba `wrangler secret put`). **Slapti**: `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`. **Paprasti**: `PADDLE_ENV=sandbox`, `PADDLE_CLIENT_TOKEN` ir šeši kainų ID: `PADDLE_PRICE_BAZINIS_MONTHLY`, `PADDLE_PRICE_BAZINIS_YEARLY`, `PADDLE_PRICE_PRO_MONTHLY`, `PADDLE_PRICE_PRO_YEARLY`, `PADDLE_PRICE_VERSLUI_MONTHLY`, `PADDLE_PRICE_VERSLUI_YEARLY` (`pri_...`). Perdiekite programą.
8. Išbandykite: įmonė su pasibaigusiu bandymu → **Apmokėti** su Paddle sandbox bandomąja kortele (Paddle dokumentacija „Test payment methods“). Po kelių sekundžių statusas turi tapti „Aktyvi“, o planas atitikti pasirinktąjį. Tada išbandykite **Pakeisti planą** ir webhook'o įvykius (Paddle → Developer tools → Notifications).

## Perėjimas prie tikrų mokėjimų (LIVE)

Paddle turi patvirtinti jūsų paskyrą ir **svetainės domeną** (Paddle → Checkout → Website approval). Prieš tai užpildykite įmonės rekvizitus ir patikrinkite juridinius puslapius (`docs/JURIDINIAI.md`): sąlygos, grąžinimai (14 dienų) ir privatumo politika privalo būti viešai prieinami. Tada: tie patys produktai ir šešios kainos LIVE aplinkoje, naujas API raktas, client-side token (`live_...`) ir webhook endpoint su nauju slaptu raktu; pakeiskite `PADDLE_ENV=production` ir visus Paddle kintamuosius; atlikite mažą tikrą apmokėjimą ir grąžinkite pinigus per Paddle. Nieko nekurkite LIVE aplinkoje, kol sandbox neišbandytas.

## Žinomi apribojimai

- **`changePlan` (PATCH /subscriptions) neišbandytas su tikru Paddle.** Pasitikrinkite sandbox: ar Paddle priima kainų keitimą su `proration_billing_mode` ir ar webhook'as atnaujina `plan_id`. Laikotarpio (mėnesinis ↔ metinis) toje pačioje prenumeratoje keisti negalima.
- **Vietų ribojimas** (`0023_seats.sql`): naujų narių pakviesti negalima, kai užimtos visos apmokėtos vietos; esami nariai nepašalinami. Žr. `SAMATOS-IR-PLANAI.md`.
- Pranešimo administratoriui apie nepavykusį apmokėjimą kol kas nėra (Paddle pats siunčia priminimus, puslapyje rodomas įspėjimas).
- Pasikeitus kainai Paddle, atnaujinkite ir `src/lib/plans.ts` (rodomos kainos).
