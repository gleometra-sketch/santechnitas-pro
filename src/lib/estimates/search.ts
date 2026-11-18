import type { LineKind } from "./calc";

/** Vienas katalogo įrašas (medžiaga, darbas ar kita pozicija) su paskutiniu vienetu ir kaina. */
export type CatalogEntry = { kind: LineKind; name: string; unit: string; priceCents: number; lastUsedAt: string };

/** Mažosios raidės be diakritikų: „Čiaupas“ ir „ciaupas“ sutampa. */
export const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Toks pat raktas kaip duomenų bazėje (kind + lower(btrim(name))): vienodi pavadinimai laikomi viena pozicija. */
export const catalogKey = (kind: LineKind, name: string) => `${kind}:${name.trim().toLowerCase()}`;

export type Indexed = CatalogEntry & { folded: string };
export const indexCatalog = (items: CatalogEntry[]): Indexed[] => items.map((i) => ({ ...i, folded: fold(i.name) }));

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Mažesnis balas = geresnis atitikimas; null = neatitinka. */
function score(folded: string, q: string, tokens: string[]): number | null {
  if (folded === q) return 0;
  if (folded.startsWith(q)) return 1;
  if (new RegExp(`(^|[\\s\\-/(.,])${escapeRe(q)}`).test(folded)) return 2;
  if (folded.includes(q)) return 3;
  if (tokens.length > 1 && tokens.every((t) => folded.includes(t))) return 4;
  return null;
}

/**
 * Siūlomi katalogo įrašai pagal įvestą pradžią ar raides (be diakritikų, žodžio pradžia ar bet kur pavadinime).
 * Tuščia paieška = neseniai naudoti. Rūšiuojama: geresnis atitikimas, tada naujausiai naudotas.
 */
export function searchCatalog(index: Indexed[], kind: LineKind | "any", query: string, limit = 8): CatalogEntry[] {
  const q = fold(query);
  const tokens = q.split(/\s+/).filter(Boolean);
  const hits: { item: Indexed; s: number }[] = [];
  for (const item of index) {
    if (kind !== "any" && item.kind !== kind) continue;
    const s = q ? score(item.folded, q, tokens) : 0;
    if (s !== null) hits.push({ item, s });
  }
  hits.sort(
    (a, b) =>
      a.s - b.s ||
      b.item.lastUsedAt.localeCompare(a.item.lastUsedAt) ||
      a.item.name.localeCompare(b.item.name, "lt"),
  );
  return hits.slice(0, limit).map((h) => ({ kind: h.item.kind, name: h.item.name, unit: h.item.unit, priceCents: h.item.priceCents, lastUsedAt: h.item.lastUsedAt }));
}

/** Prideda arba atnaujina įrašus po išsaugojimo, kad naujos pozicijos būtų siūlomos be puslapio perkrovimo. */
export function mergeCatalog(items: CatalogEntry[], learned: CatalogEntry[]): CatalogEntry[] {
  const map = new Map(items.map((i) => [catalogKey(i.kind, i.name), i]));
  for (const l of learned) map.set(catalogKey(l.kind, l.name), l);
  return [...map.values()];
}
