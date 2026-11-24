// Sutarties teksto išdėstymas spausdinimui / peržiūrai (be React, kad būtų galima testuoti).
// Pats tekstas nekeičiamas: tik atpažįstami antraštės („2. SUTARTIES DALYKAS“ -> „II. SUTARTIES DALYKAS“),
// punktai („2.1. ...“) ir sutarties data, kad puslapis atrodytų kaip įprasta darbų atlikimo sutartis.

export type ContractBlock =
  | { type: "heading"; roman: string; text: string }
  | { type: "signatures" }
  | { type: "clause"; text: string }
  | { type: "text"; text: string };

const ROMAN: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
export function toRoman(n: number): string {
  let out = "";
  let rest = Math.max(0, Math.floor(n));
  for (const [v, s] of ROMAN) while (rest >= v) { out += s; rest -= v; }
  return out;
}

const HEADING = /^(\d{1,2})\.\s+(\S.*)$/u;
const ROMAN_HEADING = /^([IVXL]{1,6})\.\s+(\S.*)$/u;
const isUpper = (s: string) => /\p{L}/u.test(s) && s === s.toUpperCase() && !/\d/.test(s) && s.length <= 80;
const CLAUSE = /^\d{1,2}(?:\.\d{1,2})+\.?\s+\S/;
const DATE_LINE = /^Sutarties data:\s*(\d{4}-\d{2}-\d{2})\s*$/;

export type ParsedContract = {
  date: string | null;
  /** Pavadinimas, jei šablono pirma eilutė yra didžiosiomis raidėmis (pvz. „DARBŲ ATLIKIMO SUTARTIS“). */
  title: string | null;
  blocks: ContractBlock[];
  /** Ar tekste jau yra skyrius „... ADRESAI IR PARAŠAI“ arba vieta {{parasu_blokas}}. */
  hasSignatures: boolean;
};

/**
 * Išskaido sutarties tekstą į dalis. Veikia ir su standartiniu šablonu (arabiški skyrių numeriai, „Sutarties data:“),
 * ir su įmonės pačios šablonu (romėniški numeriai, savo pavadinimas). `{{numeris}}` pakeičiamas dokumento numeriu.
 */
export function parseContractBody(body: string, number?: string): ParsedContract {
  const text = number !== undefined ? body.replace(/\{\{\s*numeris\s*\}\}/gi, number) : body;
  let date: string | null = null;
  let title: string | null = null;
  let seen = 0;
  const blocks: ContractBlock[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    seen++;
    if (/^\{\{\s*parasu_blokas\s*\}\}$/i.test(line)) { blocks.push({ type: "signatures" }); continue; }
    const d = DATE_LINE.exec(line);
    if (d && date === null) { date = d[1]; continue; }
    if (seen === 1 && isUpper(line) && !/[:.]$/.test(line) && /SUTART/.test(line)) { title = line; continue; }
    const h = HEADING.exec(line);
    if (h && isUpper(h[2])) { blocks.push({ type: "heading", roman: toRoman(Number(h[1])), text: h[2] }); continue; }
    const r = ROMAN_HEADING.exec(line);
    if (r && isUpper(r[2])) { blocks.push({ type: "heading", roman: r[1], text: r[2] }); continue; }
    blocks.push(CLAUSE.test(line) ? { type: "clause", text: line } : { type: "text", text: line });
  }
  const hasSignatures = blocks.some((b) => b.type === "signatures" || (b.type === "heading" && /PARAŠ/.test(b.text)));
  return { date, title, blocks, hasSignatures };
}

/** Sutarties pasirašymo vieta: paskutinė rangovo adreso dalis po kablelio (pvz. „Panevėžio g. 17, Panevėžys“ -> „Panevėžys“). */
export function cityFromAddress(address?: string | null): string {
  const parts = (address ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  return /\d/.test(last) ? "" : last;
}

/** Skyrius „ŠALIŲ ADRESAI IR PARAŠAI“ numeruojamas po paskutinės antraštės. */
export const nextRoman = (blocks: ContractBlock[]) => {
  const heads = blocks.filter((b): b is Extract<ContractBlock, { type: "heading" }> => b.type === "heading");
  const maxN = heads.reduce((m, h) => Math.max(m, fromRoman(h.roman)), 0);
  return toRoman(maxN + 1);
};
function fromRoman(r: string): number {
  const v: Record<string, number> = { I: 1, V: 5, X: 10, L: 50 };
  let t = 0;
  for (let i = 0; i < r.length; i++) {
    const a = v[r[i]] ?? 0, b = v[r[i + 1]] ?? 0;
    t += a < b ? -a : a;
  }
  return t;
}
