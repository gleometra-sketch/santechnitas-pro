/**
 * Pardavimo puslapio abonementai. Kainas ir darbuotojų limitus įrašykite čia, kai juos nuspręsite
 * (Stripe prenumeratos – 7 etape). Kol `price` yra null, kortelėje rodoma „Kaina netrukus“.
 * `seats` – darbuotojų limitas; kol null, eilutė nerodoma.
 */
export type Plan = { id: string; name: string; price: string | null; seats: string | null; features: string[]; highlight?: boolean };

const CORE = ["Objektai, darbai ir kalendorius", "Darbo laiko apskaita telefone", "Medžiagų užsakymai ir pirkimų sąrašas"];

export const PLANS: Plan[] = [
  { id: "bazinis", name: "Bazinis", price: null, seats: null, features: CORE },
  { id: "pro", name: "Pro", price: null, seats: null, features: CORE, highlight: true },
  { id: "verslui", name: "Verslui", price: null, seats: null, features: CORE },
];
