// Įmonės pačios sutarties šablonas: tekstas su {{laukais}}, kurie užpildomi automatiškai (be React, kad būtų galima testuoti).
import { cityFromAddress } from "./layout";
import { eur, type ContractTerms, type Seller } from "./logic";

export type VarGroup = "Rangovas (jūsų įmonė)" | "Užsakovas" | "Darbai" | "Kaina ir apmokėjimas" | "Terminai ir sąlygos" | "Kita";
export type VarDef = { key: string; label: string; group: VarGroup };

export const VARIABLES: VarDef[] = [
  { key: "rangovas", label: "Jūsų įmonės pavadinimas", group: "Rangovas (jūsų įmonė)" },
  { key: "rangovo_kodas", label: "Įmonės kodas", group: "Rangovas (jūsų įmonė)" },
  { key: "rangovo_pvm_kodas", label: "PVM kodas", group: "Rangovas (jūsų įmonė)" },
  { key: "rangovo_adresas", label: "Įmonės adresas", group: "Rangovas (jūsų įmonė)" },
  { key: "rangovo_telefonas", label: "Įmonės telefonas", group: "Rangovas (jūsų įmonė)" },
  { key: "rangovo_el_pastas", label: "Įmonės el. paštas", group: "Rangovas (jūsų įmonė)" },
  { key: "rangovo_sask", label: "Banko sąskaita (IBAN)", group: "Rangovas (jūsų įmonė)" },
  { key: "direktorius", label: "Direktoriaus vardas ir pavardė", group: "Rangovas (jūsų įmonė)" },
  { key: "direktoriaus_pareigos", label: "Direktoriaus pareigos", group: "Rangovas (jūsų įmonė)" },
  { key: "miestas", label: "Sutarties sudarymo vieta (miestas)", group: "Rangovas (jūsų įmonė)" },
  { key: "uzsakovas", label: "Užsakovo vardas / pavadinimas", group: "Užsakovas" },
  { key: "uzsakovo_adresas", label: "Užsakovo adresas", group: "Užsakovas" },
  { key: "uzsakovo_telefonas", label: "Užsakovo telefonas", group: "Užsakovas" },
  { key: "uzsakovo_el_pastas", label: "Užsakovo el. paštas", group: "Užsakovas" },
  { key: "objekto_adresas", label: "Objekto (darbų) adresas", group: "Darbai" },
  { key: "darbu_aprasymas", label: "Darbų aprašymas (iš sąmatos)", group: "Darbai" },
  { key: "sametos_nr", label: "Sąmatos numeris", group: "Darbai" },
  { key: "kaina", label: "Kaina su PVM", group: "Kaina ir apmokėjimas" },
  { key: "kaina_be_pvm", label: "Kaina be PVM", group: "Kaina ir apmokėjimas" },
  { key: "pvm", label: "PVM suma", group: "Kaina ir apmokėjimas" },
  { key: "pvm_procentas", label: "PVM procentas (skaičius)", group: "Kaina ir apmokėjimas" },
  { key: "pvm_tekstas", label: "„įskaitant 21 % PVM“", group: "Kaina ir apmokėjimas" },
  { key: "avansas_procentai", label: "Avanso procentas (skaičius)", group: "Kaina ir apmokėjimas" },
  { key: "avanso_suma", label: "Avanso suma", group: "Kaina ir apmokėjimas" },
  { key: "avanso_data", label: "Avanso mokėjimo data", group: "Kaina ir apmokėjimas" },
  { key: "likusi_suma", label: "Likusi suma po avanso", group: "Kaina ir apmokėjimas" },
  { key: "apmokejimo_dienos", label: "Dienos likusiai sumai sumokėti", group: "Kaina ir apmokėjimas" },
  { key: "data", label: "Sutarties data (2026-11-18)", group: "Terminai ir sąlygos" },
  { key: "data_ilga", label: "Sutarties data (2026 m. lapkričio 18 d.)", group: "Terminai ir sąlygos" },
  { key: "pradzia", label: "Darbų pradžia", group: "Terminai ir sąlygos" },
  { key: "pradzia_ilga", label: "Darbų pradžia (2026 m. lapkričio 25 d.)", group: "Terminai ir sąlygos" },
  { key: "pabaiga", label: "Darbų pabaiga", group: "Terminai ir sąlygos" },
  { key: "pabaiga_ilga", label: "Darbų pabaiga (2026 m. gruodžio 9 d.)", group: "Terminai ir sąlygos" },
  { key: "priemimo_dienos", label: "Darbų priėmimo dienos", group: "Terminai ir sąlygos" },
  { key: "garantija_men", label: "Garantija, mėnesiai", group: "Terminai ir sąlygos" },
  { key: "delspinigiai", label: "Delspinigiai, % per dieną", group: "Terminai ir sąlygos" },
  { key: "numeris", label: "Sutarties numeris (įrašomas siunčiant)", group: "Kita" },
  { key: "parasu_blokas", label: "Šalių adresų ir parašų blokas (viena eilutė)", group: "Kita" },
];

/** Laukai, kurie lieka tekste ir užpildomi tik rodant dokumentą. */
export const DEFERRED_KEYS = ["numeris", "parasu_blokas"] as const;
const LABELS = new Map(VARIABLES.map((v) => [v.key, v.label]));

const MONTHS_GEN = ["sausio", "vasario", "kovo", "balandžio", "gegužės", "birželio", "liepos", "rugpjūčio", "rugsėjo", "spalio", "lapkričio", "gruodžio"];
/** 2026-11-18 -> „2026 m. lapkričio 18 d.“ */
export function longDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  return `${m[1]} m. ${MONTHS_GEN[Number(m[2]) - 1] ?? ""} ${Number(m[3])} d.`;
}

const lt = (n: number) => n.toString().replace(".", ",");

export type TemplateData = {
  seller: Seller; clientName: string; clientAddress?: string | null; clientPhone?: string | null; clientEmail?: string | null;
  workAddress?: string | null; totalGross: number; vatRate: number; estimateNumber?: string | null; today: string; terms: ContractTerms;
};

export function buildTemplateVars(d: TemplateData): Record<string, string> {
  const s = d.seller;
  const gross = Math.max(0, d.totalGross);
  const net = d.vatRate > 0 ? Math.round((gross * 100) / (1 + d.vatRate / 100)) / 100 : gross;
  const advance = d.terms.advancePercent > 0 ? Math.round(gross * d.terms.advancePercent) / 100 : 0;
  const t = d.terms;
  return {
    rangovas: s.legal_name ?? "", rangovo_kodas: s.code ?? "", rangovo_pvm_kodas: s.vat_code ?? "", rangovo_adresas: s.address ?? "",
    rangovo_telefonas: s.phone ?? "", rangovo_el_pastas: s.email ?? "", rangovo_sask: s.iban ?? "",
    direktorius: s.director ?? "", direktoriaus_pareigos: s.director_title?.trim() || "Direktorius", miestas: cityFromAddress(s.address),
    uzsakovas: d.clientName, uzsakovo_adresas: d.clientAddress ?? "", uzsakovo_telefonas: d.clientPhone ?? "", uzsakovo_el_pastas: d.clientEmail ?? "",
    objekto_adresas: d.workAddress ?? "", darbu_aprasymas: t.workDescription, sametos_nr: d.estimateNumber ?? "",
    kaina: gross > 0 ? eur(gross) : "", kaina_be_pvm: gross > 0 ? eur(net) : "", pvm: gross > 0 ? eur(Math.round((gross - net) * 100) / 100) : "",
    pvm_procentas: lt(d.vatRate), pvm_tekstas: d.vatRate > 0 ? `įskaitant ${lt(d.vatRate)} % PVM` : "PVM netaikomas",
    avansas_procentai: lt(t.advancePercent), avanso_suma: gross > 0 ? eur(advance) : "", avanso_data: t.advanceDate,
    likusi_suma: gross > 0 ? eur(Math.round((gross - advance) * 100) / 100) : "", apmokejimo_dienos: String(t.paymentDays),
    data: d.today, data_ilga: longDate(d.today), pradzia: t.startDate, pradzia_ilga: longDate(t.startDate), pabaiga: t.endDate, pabaiga_ilga: longDate(t.endDate),
    priemimo_dienos: String(t.acceptanceDays), garantija_men: String(t.warrantyMonths), delspinigiai: lt(t.penaltyPercent),
  };
}

const TOKEN = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;

/**
 * Užpildo šablono {{laukus}}. Tušti žinomi laukai tampa [PAVADINIMU] (peržiūroje parodoma, kad trūksta duomenų);
 * {{numeris}} ir {{parasu_blokas}} paliekami, nes juos užpildo dokumento vaizdas; nežinomi laukai taip pat žymimi [LAUKU].
 */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(TOKEN, (whole, raw: string) => {
    const key = raw.toLowerCase();
    if ((DEFERRED_KEYS as readonly string[]).includes(key)) return `{{${key}}}`;
    const v = vars[key];
    if (v !== undefined && v.trim() !== "") return v.trim();
    return `[${(LABELS.get(key) ?? key.replace(/_/g, " ")).toUpperCase()}]`;
  });
}

/** Šablone panaudoti nežinomi laukai (rašybos klaidos). */
export function unknownFields(template: string): string[] {
  const found = new Set<string>();
  for (const m of template.matchAll(TOKEN)) if (!LABELS.has(m[1].toLowerCase())) found.add(m[1]);
  return [...found];
}

// ---------------------------------------------------------------- automatinis atpažinimas

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Pakeičia tekste jūsų įmonės duomenis (pavadinimą, kodą, adresą, IBAN...) laukais. */
export function autoReplaceSeller(text: string, seller: Seller): { text: string; replaced: string[] } {
  const pairs: [string, string | null | undefined, number][] = [
    ["rangovo_sask", seller.iban, 8], ["rangovo_el_pastas", seller.email, 5], ["rangovas", seller.legal_name, 3], ["rangovo_adresas", seller.address, 5],
    ["rangovo_telefonas", seller.phone, 6], ["rangovo_pvm_kodas", seller.vat_code, 5], ["rangovo_kodas", seller.code, 5], ["direktorius", seller.director, 5],
  ];
  const order = pairs.filter(([, v, min]) => v && v.trim().length >= min).sort((a, b) => b[1]!.trim().length - a[1]!.trim().length);
  let out = text;
  const replaced: string[] = [];
  for (const [key, raw] of order) {
    const v = raw!.trim();
    // IBAN ir kodai dažnai rašomi su tarpais: leidžiame tarpus tarp simbolių.
    const pattern = key === "rangovo_sask" ? v.replace(/\s+/g, "").split("").map(esc).join("\\s?") : esc(v);
    const re = new RegExp(pattern, "g");
    if (re.test(out)) {
      out = out.replace(new RegExp(pattern, "g"), `{{${key}}}`);
      replaced.push(key);
    }
  }
  return { text: out, replaced };
}

export type Candidate = { start: number; end: number; text: string; kind: "date" | "money" | "percent" | "days" | "months"; context: string };

/** Ką siūlyti pakeisti pagal rastos reikšmės rūšį. */
export const SUGGEST: Record<Candidate["kind"], string[]> = {
  date: ["data", "data_ilga", "pradzia", "pradzia_ilga", "pabaiga", "pabaiga_ilga", "avanso_data"],
  money: ["kaina", "kaina_be_pvm", "pvm", "avanso_suma", "likusi_suma"],
  percent: ["pvm_procentas", "avansas_procentai", "delspinigiai"],
  days: ["apmokejimo_dienos", "priemimo_dienos"],
  months: ["garantija_men"],
};
export const KIND_NAME: Record<Candidate["kind"], string> = { date: "Data", money: "Suma", percent: "Procentai", days: "Dienos", months: "Mėnesiai" };

const LETTERS = "A-Za-zĄČĘĖĮŠŲŪŽąčęėįšųūž";
const PATTERNS: [Candidate["kind"], RegExp][] = [
  ["date", new RegExp(`\\d{4}\\s*m\\.\\s*[${LETTERS}]+\\s+\\d{1,2}\\s*(?:d\\.|dien[${LETTERS}]*)`, "g")],
  ["date", /\b\d{4}-\d{2}-\d{2}\b/g],
  ["date", /\b\d{4}\.\d{2}\.\d{2}\b/g],
  ["money", /\d[\d  ]*(?:[.,]\d{1,2})?[.,]?\s?(?:Eur\b|EUR\b|eurų|€)/g],
  ["percent", /\d+(?:[.,]\d+)?(?=\s?%)/g],
  ["days", new RegExp(`\\d+(?=\\s+(?:kalendorin[${LETTERS}]*\\s+|darbo\\s+)?(?:dien[${LETTERS}]*|d\\.\\s?d\\.))`, "g")],
  ["months", new RegExp(`\\d+(?=\\s*(?:mėn\\.|mėnesi[${LETTERS}]*|mėn\\b))`, "g")],
];

/** Tekste randa datas, sumas, procentus ir terminus, kuriuos galima pakeisti laukais. */
export function findCandidates(text: string): Candidate[] {
  const all: Candidate[] = [];
  for (const [kind, re] of PATTERNS) {
    for (const m of text.matchAll(re)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      // Jau pakeistos vietos ({{...}}) nesiūlomos.
      const before = text.lastIndexOf("{{", start);
      if (before !== -1 && text.indexOf("}}", before) >= end) continue;
      all.push({ start, end, text: m[0].trim(), kind, context: text.slice(Math.max(0, start - 28), Math.min(text.length, end + 20)).replace(/\s+/g, " ") });
    }
  }
  all.sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Candidate[] = [];
  for (const c of all) if (!out.length || c.start >= out[out.length - 1].end) out.push(c);
  return out;
}

export function replaceRange(text: string, start: number, end: number, key: string): string {
  return `${text.slice(0, start)}{{${key}}}${text.slice(end)}`;
}
