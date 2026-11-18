import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_ITEM } from "../../src/lib/documents/draft";
import { DEFAULT_TERMS, buildContractText, computeTotals, countPlaceholders, lineCents, parseNum, shareLinks, splitGross, summarizeWork } from "../../src/lib/documents/logic";

test("parseNum: kablelis, tarpai, netinkama reikšmė", () => {
  assert.equal(parseNum("12,5"), 12.5);
  assert.equal(parseNum("1 250,40"), 1250.4);
  assert.equal(parseNum(7), 7);
  assert.ok(Number.isNaN(parseNum("abc")));
  assert.ok(Number.isNaN(parseNum(undefined)));
  assert.ok(Number.isNaN(parseNum(null)));
  assert.ok(Number.isNaN(parseNum(undefined)));
  assert.ok(Number.isNaN(parseNum(null)));
});

test("EMPTY_ITEM: visi laukai yra tekstai (serverio puslapis jį kopijuoja kaip naujos sąmatos pirmą eilutę)", () => {
  assert.deepEqual(Object.keys(EMPTY_ITEM).sort(), ["description", "kind", "quantity", "unit", "unit_price"]);
  for (const v of Object.values(EMPTY_ITEM)) assert.equal(typeof v, "string");
  assert.ok(!Number.isNaN(parseNum({ ...EMPTY_ITEM }.quantity)));
});

test("lineCents: kiekis × kaina centais be slankiojo kablelio klaidų", () => {
  assert.equal(lineCents(2.5, 10.5), 2625);
  assert.equal(lineCents(3, 19.99), 5997);
  assert.equal(lineCents(0.1, 0.2), 2); // 0,02 €
  assert.equal(lineCents(1.005, 1), 101); // 1,005 € -> 1,01 €, kaip duomenų bazėje (round(x, 2))
  assert.equal(lineCents(0, 99), 0);
});

test("computeTotals: pavyzdys iš duomenų bazės testo", () => {
  const t = computeTotals([{ quantity: 2.5, unit_price: 10.5 }, { quantity: 3, unit_price: 19.99 }], 21);
  assert.deepEqual(t, { net: 86.22, vat: 18.11, gross: 104.33 });
  assert.deepEqual(computeTotals([{ quantity: 1, unit_price: 100 }], 0), { net: 100, vat: 0, gross: 100 });
  assert.deepEqual(computeTotals([], 21), { net: 0, vat: 0, gross: 0 });
});

test("splitGross: sutarties suma su PVM išskaidoma į be PVM ir PVM", () => {
  assert.deepEqual(splitGross(1210, 21), { net: 1000, vat: 210, gross: 1210 });
  assert.deepEqual(splitGross(100, 0), { net: 100, vat: 0, gross: 100 });
});

const seller = { legal_name: "UAB Santechnika", code: "123", iban: "LT00 0000" };

test("buildContractText: įrašo rekvizitus, sąmatą ir palieka laukus užpildyti ranka", () => {
  const text = buildContractText({ seller, clientName: "Jonas Jonaitis", workAddress: "Vilnius, Gedimino 1", totalGross: 1210, vatRate: 21, estimateNumber: "S-2026-0001", today: "2026-11-15" });
  assert.match(text, /Rangovas: UAB Santechnika, kodas 123/);
  assert.match(text, /Užsakovas: Jonas Jonaitis/);
  assert.match(text, /sąmatoje Nr\. S-2026-0001/);
  assert.match(text, /įskaitant 21 % PVM/);
  assert.match(text, /Gedimino 1/);
  assert.ok(countPlaceholders(text) > 5, "šablone turi likti ranka pildomų [LAUKŲ]");
});

test("buildContractText: be rekvizitų ir sumos rodo vietos žymeklius; PVM 0 -> netaikomas", () => {
  const text = buildContractText({ seller: {}, clientName: "Ona", totalGross: 0, vatRate: 0, today: "2026-11-15" });
  assert.match(text, /\[RANGOVO PAVADINIMAS\]/);
  assert.match(text, /\[SUMA\] EUR \(PVM netaikomas\)/);
  assert.doesNotMatch(text, /sąmatoje Nr\./);
});

test("countPlaceholders: skaičiuoja tik [LAUKUS], ne trumpus ar daugiaeilučius skliaustus", () => {
  assert.equal(countPlaceholders("Pradžia: [DATA]. Pabaiga: [DATA]."), 2);
  assert.equal(countPlaceholders("a [x] b"), 0);
  assert.equal(countPlaceholders("[eilutė\nper dvi]"), 0);
  assert.equal(countPlaceholders(""), 0);
});

test("shareLinks: tekstas ir nuorodos teisingai užkoduoti", () => {
  const l = shareLinks({ url: "https://app.lt/d/abc", kind: "estimate", number: "S-2026-0001", clientName: "Jonas & Ona", email: "j@x.lt", phone: "+370 600 00000" });
  assert.match(l.text, /Siunčiame sąmatą Nr\. S-2026-0001/);
  assert.match(l.text, /https:\/\/app\.lt\/d\/abc/);
  assert.match(shareLinks({ url: "u", kind: "contract", number: "SUT-1", clientName: "X" }).text, /Siunčiame sutartį Nr\. SUT-1/);
  assert.ok(l.mailto.startsWith("mailto:j@x.lt?subject=S%C4%85mata%20Nr.%20S-2026-0001&body="));
  assert.ok(l.sms.startsWith("sms:+37060000000?&body="));
  assert.ok(l.whatsapp.startsWith("https://wa.me/?text="));
  assert.ok(!l.whatsapp.includes("&Ona"), "& turi būti užkoduotas");
});

test("EMPTY_ITEM: naujos eilutės šablonas turi visus laukus (serverio puslapis jį kopijuoja)", () => {
  assert.deepEqual(Object.keys(EMPTY_ITEM).sort(), ["description", "kind", "quantity", "unit", "unit_price"]);
  assert.deepEqual({ ...EMPTY_ITEM }, { kind: "material", description: "", quantity: "1", unit: "vnt.", unit_price: "" });
});

const terms = { workDescription: "Čiaupo keitimas; vamzdžių montavimas", advancePercent: 30, advanceDate: "2026-11-25", paymentDays: 7, startDate: "2026-11-25", endDate: "2026-12-09", acceptanceDays: 5, warrantyMonths: 24, penaltyPercent: 0.02 };
const base = { seller: { legal_name: "Santechnitas", code: "1", iban: "LT00" }, clientName: "Virgis", workAddress: "Kaunas", totalGross: 3375.9, vatRate: 21, estimateNumber: "2026-007", today: "2026-11-18" };

test("buildContractText su sąlygomis: nelieka ranka pildomų laukų, skaičiai įrašyti", () => {
  const t = buildContractText({ ...base, terms });
  assert.equal(countPlaceholders(t), 0);
  assert.match(t, /šiuos darbus: Čiaupo keitimas; vamzdžių montavimas objekte/);
  assert.match(t, /3\.2\. Avansas: 30 % \(.*1\s?012,77.*\), mokamas iki 2026-11-25\./);
  assert.match(t, /3\.3\. Likusią sumą Užsakovas sumoka per 7 dienų/);
  assert.match(t, /Darbų pradžia: 2026-11-25\. Darbų pabaiga: 2026-12-09\./);
  assert.match(t, /per 5 darbo dienas/);
  assert.match(t, /24 mėn\. garantiją/);
  assert.match(t, /0,02 % dydžio delspinigiai/);
});

test("buildContractText: be avanso", () => {
  const t = buildContractText({ ...base, terms: { ...terms, advancePercent: 0 } });
  assert.match(t, /3\.2\. Avansas netaikomas\./);
  assert.match(t, /3\.3\. Visą sumą Užsakovas sumoka/);
  assert.equal(countPlaceholders(t), 0);
});

test("buildContractText: tuščias darbų aprašymas ar data palieka žymeklį, be sąlygų – kaip anksčiau", () => {
  assert.match(buildContractText({ ...base, terms: { ...terms, workDescription: "", startDate: "" } }), /\[DARBŲ APRAŠYMAS\]/);
  const old = buildContractText(base);
  assert.match(old, /3\.3\. Likusią sumą Užsakovas sumoka per \[DIENŲ SKAIČIUS\]/);
});

test("summarizeWork: be pasikartojimų, sutrumpina ilgą sąrašą", () => {
  assert.equal(summarizeWork([" Čiaupas ", "čiaupas", "Vamzdis"]), "Čiaupas; Vamzdis");
  assert.equal(summarizeWork([]), "");
  assert.equal(summarizeWork(["a", "b", "c"], 2), "a; b ir kiti darbai pagal sąmatą");
  assert.ok(DEFAULT_TERMS.advancePercent > 0);
});
