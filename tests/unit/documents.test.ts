import { test } from "node:test";
import assert from "node:assert/strict";
import { buildContractText, computeTotals, countPlaceholders, lineCents, parseNum, shareLinks, splitGross } from "../../src/lib/documents/logic";

test("parseNum: kablelis, tarpai, netinkama reikšmė", () => {
  assert.equal(parseNum("12,5"), 12.5);
  assert.equal(parseNum("1 250,40"), 1250.4);
  assert.equal(parseNum(7), 7);
  assert.ok(Number.isNaN(parseNum("abc")));
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
