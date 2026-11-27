/**
 * Pardavėjo (jūsų įmonės) rekvizitai ir pagrindinės sąlygos juridiniams puslapiams (/salygos, /grazinimai, /privatumas).
 * Rekvizitai imami iš aplinkos kintamųjų (wrangler.jsonc „vars“): LEGAL_NAME, LEGAL_CODE, LEGAL_ADDRESS, LEGAL_EMAIL, LEGAL_VAT.
 * Paddle reikalauja tikslaus teisinio pavadinimo sąlygose ir privatumo pranešime, todėl jo nespėjame.
 */

/** Grąžinimo laikotarpis dienomis. Paddle reikalauja 14–90 dienų ir draudžia „negrąžinama“. */
export const REFUND_DAYS = 14;
export const TRIAL_DAYS = 14;
export const LEGAL_UPDATED = "2026-11-26";

export type Legal = { name: string; code: string; address: string; email: string; vat: string };

export function getLegal(env: Record<string, string | undefined> = process.env): Legal {
  const v = (k: string) => (env[k] ?? "").trim();
  return { name: v("LEGAL_NAME"), code: v("LEGAL_CODE"), address: v("LEGAL_ADDRESS"), email: v("LEGAL_EMAIL"), vat: v("LEGAL_VAT") };
}

/** Kurių privalomų rekvizitų dar nėra. */
export const legalMissing = (l: Legal): string[] =>
  [
    ["LEGAL_NAME", l.name],
    ["LEGAL_ADDRESS", l.address],
    ["LEGAL_EMAIL", l.email],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);
