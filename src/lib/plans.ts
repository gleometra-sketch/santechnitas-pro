/**
 * Pardavimo puslapio abonementai. Kaina skaičiuojama už kiekvieną darbuotoją.
 * Kainas keiskite čia; tikros Stripe kainos (STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY) nustatomos 7 etape
 * ir turi sutapti su šiomis reikšmėmis.
 */
export type Plan = {
  id: "month" | "year";
  name: string;
  price: string;
  per: string;
  note?: string;
  features: string[];
  highlight?: boolean;
};

const CORE = [
  "Pilna prieiga prie visų funkcijų",
  "Objektai, darbai ir kalendorius",
  "Darbo laiko apskaita telefone",
  "Medžiagų užsakymai ir pirkimų sąrašas",
];

export const PLANS: Plan[] = [
  { id: "month", name: "Mėnesinis", price: "3", per: "darbuotojui / mėn.", note: "Atsisakyti galite bet kada.", features: CORE },
  { id: "year", name: "Metinis", price: "29", per: "darbuotojui / metus", note: "Sutaupote 7 € už darbuotoją per metus.", features: CORE, highlight: true },
];
