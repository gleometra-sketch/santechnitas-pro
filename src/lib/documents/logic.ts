// Sąmatų ir sutarčių logika be Supabase (sumos, etiketės, sutarties šablonas, dalijimosi nuorodos).

export type DocKind = "estimate" | "contract";
export type DocStatus = "draft" | "sent" | "approved" | "declined" | "cancelled";

export const KIND_LABEL: Record<DocKind, string> = { estimate: "Sąmata", contract: "Sutartis" };
// Linksniai sakiniams: „Siunčiame sąmatą“, „su sąmatos sąlygomis“.
export const KIND_ACC: Record<DocKind, string> = { estimate: "sąmatą", contract: "sutartį" };
export const KIND_GEN: Record<DocKind, string> = { estimate: "sąmatos", contract: "sutarties" };
export const STATUS_LABEL: Record<DocStatus, string> = {
  draft: "Juodraštis", sent: "Išsiųsta", approved: "Patvirtinta", declined: "Atmesta", cancelled: "Atšaukta",
};
export const STATUS_STYLE: Record<DocStatus, string> = {
  draft: "bg-surface text-muted",
  sent: "bg-amber-50 text-amber-800",
  approved: "bg-go-soft text-go-dark",
  declined: "bg-red-50 text-danger",
  cancelled: "bg-surface text-muted",
};

export type DocItem = { description: string; quantity: number; unit: string; unit_price: number };
export type Seller = {
  legal_name?: string | null; code?: string | null; vat_code?: string | null;
  address?: string | null; phone?: string | null; email?: string | null; iban?: string | null;
  director?: string | null; director_title?: string | null;
  /** Rangovo parašas (PNG duomenų nuoroda) iš įmonės rekvizitų. */
  signature?: string | null;
};

const eurFmt = new Intl.NumberFormat("lt-LT", { style: "currency", currency: "EUR" });
export const eur = (n: number) => eurFmt.format(n);

/** Skaičius iš įvesties laukelio (priima kablelį kaip kablelį po kablelio). */
export function parseNum(v: string | number | null | undefined): number {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return NaN; // tuščia ar trūkstama reikšmė neturi nulaužti skaičiavimo
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

// Skaičiuojame centais, kad sutaptų su duomenų bazės apvalinimu (round(x, 2)).
export const lineCents = (q: number, p: number) => Math.round((Math.round(q * 1000) * Math.round(p * 100)) / 1000);
export const lineTotal = (q: number, p: number) => lineCents(q, p) / 100;

export function computeTotals(items: Pick<DocItem, "quantity" | "unit_price">[], vatRate: number) {
  const net = items.reduce((s, i) => s + lineCents(i.quantity || 0, i.unit_price || 0), 0);
  const vat = Math.round((net * Math.round(vatRate * 100)) / 10000);
  return { net: net / 100, vat: vat / 100, gross: (net + vat) / 100 };
}

/** Iš bendros sumos su PVM (sutartims). */
export function splitGross(gross: number, vatRate: number) {
  const net = Math.round((gross * 100) / (1 + vatRate / 100)) / 100;
  return { net, vat: Math.round((gross - net) * 100) / 100, gross };
}

const dash = (s?: string | null) => (s && s.trim() ? s.trim() : "");
const part = (label: string, v?: string | null) => (dash(v) ? `, ${label} ${dash(v)}` : "");

/** Sutarties sąlygos, iš kurių automatiškai sudaromas tekstas (be ranka pildomų laukų). */
export type ContractTerms = {
  workDescription: string;
  /** 0 = avansas netaikomas. */
  advancePercent: number;
  advanceDate: string;
  paymentDays: number;
  startDate: string;
  endDate: string;
  acceptanceDays: number;
  warrantyMonths: number;
  /** Delspinigiai, % už dieną. */
  penaltyPercent: number;
};

/** Įprastos sąlygos: keičiamos redaktoriuje, o sutarties tekstas atsinaujina pats. */
export const DEFAULT_TERMS = { advancePercent: 30, paymentDays: 7, acceptanceDays: 5, warrantyMonths: 24, penaltyPercent: 0.02, startInDays: 7, durationDays: 14 } as const;

/** Darbų aprašymas iš sąmatos eilučių pavadinimų: pirmos kelios, o likusios sutrumpinamos. */
export function summarizeWork(names: string[], max = 8): string {
  const uniq: string[] = [];
  for (const n of names.map((x) => x.trim().replace(/\s+/g, " ")).filter(Boolean)) if (!uniq.some((u) => u.toLowerCase() === n.toLowerCase())) uniq.push(n);
  if (uniq.length === 0) return "";
  const shown = uniq.slice(0, max).join("; ");
  return uniq.length > max ? `${shown} ir kiti darbai pagal sąmatą` : shown;
}

const lt = (n: number) => n.toString().replace(".", ",");
const orPlaceholder = (v: string | undefined, label: string) => (v && v.trim() ? v.trim() : `[${label}]`);

/**
 * Sutarties tekstas. Su `terms` visi skaičiai ir datos įrašomi automatiškai (nelieka ranka pildomų laukų);
 * be `terms` palieka [LAUKUS] užpildyti ranka. Prieš naudojimą tekstą peržiūrėkite su teisininku.
 */
export function buildContractText(p: {
  seller: Seller; clientName: string; clientAddress?: string | null; workAddress?: string | null;
  totalGross: number; vatRate: number; estimateNumber?: string | null; today: string; terms?: ContractTerms;
}): string {
  const s = p.seller;
  const t = p.terms;
  const advance = t && t.advancePercent > 0 ? { pct: t.advancePercent, sum: Math.round(p.totalGross * t.advancePercent) / 100 } : null;
  const vat = p.vatRate > 0 ? `įskaitant ${p.vatRate.toString().replace(".", ",")} % PVM` : "PVM netaikomas";
  const lines = [
    `Sutarties data: ${p.today}`,
    "",
    "1. SUTARTIES ŠALYS",
    `Rangovas: ${dash(s.legal_name) || "[RANGOVO PAVADINIMAS]"}${part("kodas", s.code)}${part("PVM kodas", s.vat_code)}${part("adresas", s.address)}${part("tel.", s.phone)}${part("el. paštas", s.email)}.`,
    `Užsakovas: ${p.clientName}${p.clientAddress ? `, adresas: ${p.clientAddress}` : ""}.`,
    "",
    "2. SUTARTIES DALYKAS",
    `2.1. Rangovas įsipareigoja atlikti šiuos darbus: ${t ? orPlaceholder(t.workDescription, "DARBŲ APRAŠYMAS") : "[DARBŲ APRAŠYMAS]"} objekte adresu: ${dash(p.workAddress) || "[OBJEKTO ADRESAS]"}.`,
    ...(p.estimateNumber ? [`2.2. Darbų apimtis ir kiekiai nurodyti sąmatoje Nr. ${p.estimateNumber}, kuri yra neatskiriama šios sutarties dalis.`] : []),
    "2.3. Užsakovas įsipareigoja sudaryti sąlygas darbams atlikti, priimti atliktus darbus ir sumokėti sutartą kainą.",
    "",
    "3. KAINA IR ATSISKAITYMAS",
    `3.1. Darbų kaina: ${p.totalGross > 0 ? eur(p.totalGross) : "[SUMA] EUR"} (${vat}).`,
    t
      ? advance
        ? `3.2. Avansas: ${lt(advance.pct)} % (${eur(advance.sum)}), mokamas iki ${orPlaceholder(t.advanceDate, "DATA")}.`
        : "3.2. Avansas netaikomas."
      : "3.2. Avansas: [AVANSO SUMA ARBA PROCENTAS], mokamas iki [DATA].",
    `3.3. ${t && !advance ? "Visą" : "Likusią"} sumą Užsakovas sumoka per ${t ? t.paymentDays : "[DIENŲ SKAIČIUS]"} dienų po darbų priėmimo–perdavimo akto pasirašymo.`,
    `3.4. Mokėjimai atliekami pavedimu į Rangovo sąskaitą${dash(s.iban) ? ` ${dash(s.iban)}` : " [SĄSKAITOS NR.]"}.`,
    "3.5. Papildomi darbai, kurių nėra sąmatoje, atliekami tik raštu (įskaitant el. paštu) suderinus jų kainą ir terminą.",
    "",
    "4. TERMINAI",
    `4.1. Darbų pradžia: ${t ? orPlaceholder(t.startDate, "DATA") : "[DATA]"}. Darbų pabaiga: ${t ? orPlaceholder(t.endDate, "DATA") : "[DATA]"}.`,
    "4.2. Terminai pratęsiami, jei darbų negalima atlikti dėl Užsakovo kaltės, nepalankių oro sąlygų ar aplinkybių, kurių Rangovas negalėjo numatyti.",
    "",
    "5. DARBŲ PRIĖMIMAS",
    `5.1. Baigęs darbus, Rangovas apie tai praneša Užsakovui. Užsakovas per ${t ? t.acceptanceDays : "[DARBO DIENŲ SKAIČIUS]"} darbo dienas apžiūri darbus ir pasirašo priėmimo–perdavimo aktą arba raštu pateikia motyvuotas pastabas.`,
    "5.2. Pastabos pašalinamos per Šalių suderintą protingą terminą.",
    "",
    "6. GARANTIJA",
    `6.1. Rangovas suteikia atliktiems darbams ${t ? t.warrantyMonths : "[GARANTINIS TERMINAS]"} mėn. garantiją, skaičiuojamą nuo priėmimo–perdavimo akto pasirašymo.`,
    "6.2. Garantija netaikoma trūkumams, atsiradusiems dėl netinkamo naudojimo ar trečiųjų asmenų veiksmų.",
    "",
    "7. ŠALIŲ ATSAKOMYBĖ",
    "7.1. Už sutarties pažeidimą Šalys atsako pagal Lietuvos Respublikos teisės aktus.",
    `7.2. Už pavėluotą mokėjimą taikomi ${t ? lt(t.penaltyPercent) : "[PROCENTAS]"} % dydžio delspinigiai už kiekvieną pavėluotą dieną.`,
    "",
    "8. BAIGIAMOSIOS NUOSTATOS",
    "8.1. Sutartis įsigalioja, kai Užsakovas ją patvirtina elektroniniu būdu (patvirtinimo nuorodoje) arba pasirašo, ir galioja iki visiško Šalių įsipareigojimų įvykdymo.",
    "8.2. Ginčai sprendžiami derybomis, o nepavykus – Lietuvos Respublikos teismuose.",
    "8.3. Sutarties pakeitimai galioja tik raštu.",
  ];
  return lines.join("\n");
}

/** Kiek neužpildytų laukų [LIKO] yra tekste. */
export const countPlaceholders = (text: string) => (text.match(/\[[^\]\n]{2,60}\]/g) ?? []).length;

export function shareLinks(p: { url: string; kind: DocKind; number: string; clientName: string; email?: string | null; phone?: string | null }) {
  const label = KIND_ACC[p.kind];
  const text = `Sveiki, ${p.clientName}! Siunčiame ${label} Nr. ${p.number}. Peržiūrėti ir patvirtinti galite čia: ${p.url}`;
  const subject = `${KIND_LABEL[p.kind]} Nr. ${p.number}`;
  return {
    text,
    mailto: `mailto:${p.email ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`,
    sms: `sms:${(p.phone ?? "").replace(/\s/g, "")}?&body=${encodeURIComponent(text)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
  };
}

/** Ar nuoroda rodo į vietinį adresą (localhost, 127.x, 10.x, 192.168.x, *.local) – tokios klientas neatsidarys. */
export function isLocalUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return h === "localhost" || h === "::1" || h.endsWith(".local") ||
      /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h);
  } catch {
    return false;
  }
}
