import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcTotals, formatInputCents, formatInputPercent, formatQty, lineTotalCents, parsePercentHundredths, parsePriceCents,
  parseQuantity, percentOfCents, totalsFromSubtotal,
} from "../../src/lib/estimates/calc";
import { catalogKey, fold, indexCatalog, mergeCatalog, searchCatalog, type CatalogEntry } from "../../src/lib/estimates/search";

test("parseQuantity: kablelis ar taškas, iki 3 skaitmenų, ribos", () => {
  assert.equal(parseQuantity("12"), 12000);
  assert.equal(parseQuantity("12,5"), 12500);
  assert.equal(parseQuantity(" 0.125 "), 125);
  assert.equal(parseQuantity("1 250,5"), 1_250_500);
  assert.equal(parseQuantity("0"), 0);
  assert.equal(parseQuantity("100000"), 100_000_000);
  assert.equal(parseQuantity("100000,001"), null);
  assert.equal(parseQuantity("1,2345"), null);
  assert.equal(parseQuantity("-3"), null);
  assert.equal(parseQuantity(""), null);
  assert.equal(parseQuantity("abc"), null);
});

test("parsePriceCents: iki 2 skaitmenų, iki 1 000 000 €", () => {
  assert.equal(parsePriceCents("3,2"), 320);
  assert.equal(parsePriceCents("3.20"), 320);
  assert.equal(parsePriceCents("0,05"), 5);
  assert.equal(parsePriceCents("1000000"), 100_000_000);
  assert.equal(parsePriceCents("1000000,01"), null);
  assert.equal(parsePriceCents("3,205"), null);
  assert.equal(parsePriceCents(""), null);
  assert.equal(parsePriceCents("-1"), null);
});

test("parsePercentHundredths", () => {
  assert.equal(parsePercentHundredths("21"), 2100);
  assert.equal(parsePercentHundredths("21,5"), 2150);
  assert.equal(parsePercentHundredths("0"), 0);
  assert.equal(parsePercentHundredths("100"), 10000);
  assert.equal(parsePercentHundredths("100,01"), null);
  assert.equal(parsePercentHundredths("1000"), null);
});

test("formatai laukeliams", () => {
  assert.equal(formatQty(12500), "12,5");
  assert.equal(formatQty(3000), "3");
  assert.equal(formatQty(125), "0,125");
  assert.equal(formatQty(1050), "1,05");
  assert.equal(formatInputCents(1250), "12,50");
  assert.equal(formatInputCents(5), "0,05");
  assert.equal(formatInputPercent(2100), "21");
  assert.equal(formatInputPercent(2150), "21,5");
  assert.equal(formatInputPercent(2105), "21,05");
});

test("eilutės suma apvalinama iki cento (pusė į viršų)", () => {
  assert.equal(lineTotalCents(2500, 320), 800); // 2,5 m × 3,20 €
  assert.equal(lineTotalCents(1000, 1999), 1999);
  assert.equal(lineTotalCents(333, 100), 33); // 0,333 × 1,00 € = 0,333 -> 33 ct
  assert.equal(lineTotalCents(5, 100), 1); // 0,005 × 1,00 € = 0,5 ct -> 1 ct
  assert.equal(lineTotalCents(4, 100), 0);
  assert.equal(lineTotalCents(100_000_000, 100_000_000), 10_000_000_000_000); // didžiausia eilutė, be paklaidų
});

test("percentOfCents ir PVM", () => {
  assert.equal(percentOfCents(10000, 2100), 2100);
  assert.equal(percentOfCents(1, 5000), 1); // 0,5 ct -> 1 ct
  assert.equal(percentOfCents(8640, 1000), 864);
});

test("calcTotals: medžiagos, darbai, nuolaida, PVM", () => {
  const lines = [
    { kind: "material" as const, qtyMilli: 2500, priceCents: 320 }, // 8,00
    { kind: "work" as const, qtyMilli: 3000, priceCents: 2500 }, // 75,00
    { kind: "material" as const, qtyMilli: 1000, priceCents: 340 }, // 3,40
  ];
  const t = calcTotals(lines, 1000, 2100); // 10 % nuolaida, 21 % PVM
  assert.equal(t.materials, 1140);
  assert.equal(t.works, 7500);
  assert.equal(t.other, 0);
  assert.equal(t.subtotal, 8640);
  assert.equal(t.discount, 864);
  assert.equal(t.net, 7776);
  assert.equal(t.vat, 1633); // 77,76 × 21 % = 16,3296 -> 16,33
  assert.equal(t.total, 9409);
});

test("calcTotals be eilučių ir su 0 %", () => {
  const t = calcTotals([], 0, 0);
  assert.deepEqual(t, { materials: 0, works: 0, other: 0, subtotal: 0, discount: 0, net: 0, vat: 0, total: 0 });
  assert.deepEqual(totalsFromSubtotal(10000, 0, 2100), { subtotal: 10000, discount: 0, net: 10000, vat: 2100, total: 12100 });
});

/* ------------------------------------------------------------------ katalogo paieška */
const E = (kind: CatalogEntry["kind"], name: string, priceCents: number, lastUsedAt: string, unit = "vnt."): CatalogEntry => ({ kind, name, unit, priceCents, lastUsedAt });
const CATALOG = indexCatalog([
  E("material", "Varinis vamzdis 15 mm", 320, "2026-03-01T10:00:00Z", "m"),
  E("material", "Varinis alkūnė 90°", 150, "2026-05-01T10:00:00Z"),
  E("material", "PPR vamzdis 20 mm", 90, "2026-04-01T10:00:00Z", "m"),
  E("material", "Čiaupas maišytuvas", 4500, "2026-02-01T10:00:00Z"),
  E("material", "Maišytuvo žarnelė", 600, "2026-01-01T10:00:00Z"),
  E("work", "Vamzdžių montavimas", 2500, "2026-05-05T10:00:00Z", "val."),
]);
const names = (r: CatalogEntry[]) => r.map((x) => x.name);

test("fold: be diakritikų ir didžiųjų raidžių", () => {
  assert.equal(fold("  Čiaupas ŠALTAS "), "ciaupas saltas");
  assert.equal(fold("Ūkis žąsų"), "ukis zasu");
  assert.equal(fold("Alkūnė"), "alkune");
});

test("paieška: pradžia, raidės be diakritikų, žodžio pradžia, tik tos pačios rūšies", () => {
  assert.deepEqual(names(searchCatalog(CATALOG, "material", "var")), ["Varinis alkūnė 90°", "Varinis vamzdis 15 mm"]); // naujausias pirmas
  assert.deepEqual(names(searchCatalog(CATALOG, "material", "ciau")), ["Čiaupas maišytuvas"]);
  assert.deepEqual(names(searchCatalog(CATALOG, "material", "vamz")), ["PPR vamzdis 20 mm", "Varinis vamzdis 15 mm"]); // žodžio pradžia
  assert.deepEqual(names(searchCatalog(CATALOG, "work", "var")), []);
  assert.deepEqual(names(searchCatalog(CATALOG, "work", "montav")), ["Vamzdžių montavimas"]);
});

test("paieška: pradžios atitikimas pranoksta įtraukimą, keli žodžiai bet kokia tvarka", () => {
  assert.deepEqual(names(searchCatalog(CATALOG, "material", "maisyt"))[0], "Maišytuvo žarnelė"); // prasideda „maisyt“
  assert.deepEqual(names(searchCatalog(CATALOG, "material", "15 var")), ["Varinis vamzdis 15 mm"]);
  assert.deepEqual(names(searchCatalog(CATALOG, "material", "xyz")), []);
});

test("paieška: tuščia = neseniai naudoti, ribojama", () => {
  const r = searchCatalog(CATALOG, "material", "", 3);
  assert.deepEqual(names(r), ["Varinis alkūnė 90°", "PPR vamzdis 20 mm", "Varinis vamzdis 15 mm"]);
  assert.equal(r[0].priceCents, 150);
});

test("katalogo raktas ir sujungimas po išsaugojimo", () => {
  assert.equal(catalogKey("material", "  Varinis VAMZDIS "), catalogKey("material", "varinis vamzdis"));
  assert.notEqual(catalogKey("material", "x"), catalogKey("work", "x"));
  const base = [E("material", "Varinis vamzdis 15 mm", 320, "2026-03-01T10:00:00Z", "m")];
  const merged = mergeCatalog(base, [E("material", "varinis vamzdis 15 mm", 340, "2026-06-01T10:00:00Z", "m"), E("work", "Montavimas", 2500, "2026-06-01T10:00:00Z", "val.")]);
  assert.equal(merged.length, 2);
  assert.equal(merged.find((m) => m.kind === "material")?.priceCents, 340);
});
