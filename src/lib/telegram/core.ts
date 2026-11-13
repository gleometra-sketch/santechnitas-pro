/**
 * Grynos Telegram pagalbinės funkcijos (be Supabase ir tinklo), kad jas būtų galima išbandyti atskirai.
 */

/** Pranešimų kategorijos, kurias administratorius gali įjungti / išjungti komandomis. */
export const CATEGORIES = {
  medziagos: "Medžiagų poreikiai",
  pastabos: "Pastabos biurui",
  darbas: "Darbo pradžia ir pabaiga",
} as const;
export type Category = keyof typeof CATEGORIES;
export const isCategory = (v: string): v is Category => Object.prototype.hasOwnProperty.call(CATEGORIES, v);

/** Telegram HTML režimui: išvengiame vartotojo įvesto teksto interpretavimo kaip žymų. */
export function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Trumpina ilgą tekstą (Telegram riba 4096 simboliai visai žinutei). */
export function clip(text: string, max: number): string {
  const t = text.trim();
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + "…";
}

export type ParsedCommand = { name: string; arg: string };

/** "/start@MusuBotas abc" -> { name: "start", arg: "abc" }. Ne komanda -> null. */
export function parseCommand(text: string | undefined | null): ParsedCommand | null {
  const m = /^\/([A-Za-z0-9_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/.exec((text ?? "").trim());
  if (!m) return null;
  return { name: m[1].toLowerCase(), arg: (m[2] ?? "").trim() };
}

/** Telegram deep link parametras: tik A–Z a–z 0–9 _ - iki 64 simbolių. */
export const isValidStartToken = (t: string) => /^[A-Za-z0-9_-]{20,64}$/.test(t);

/** Konstantaus laiko eilučių palyginimas (webhook slaptažodžiui). */
export function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** Atsitiktinis vienkartinis kodas (base64url, 32 simboliai) ir jo SHA-256 maiša. Naudoja Web Crypto (veikia Cloudflare Workers). */
export async function newToken(): Promise<{ token: string; hash: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return { token, hash: await sha256Hex(token) };
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Minutės -> "7 val. 32 min". */
export function formatMinutes(total: number): string {
  const m = Math.max(0, Math.round(total));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  return r === 0 ? `${h} val.` : `${h} val. ${r} min`;
}
