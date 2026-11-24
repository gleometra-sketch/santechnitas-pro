import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_TERMS } from "../../src/lib/documents/logic";
import { autoReplaceSeller, buildTemplateVars, findCandidates, longDate, renderTemplate, replaceRange, unknownFields, VARIABLES } from "../../src/lib/documents/template";
import { docxXmlToText } from "../../src/lib/documents/docx";

const seller = { legal_name: "UAB Santechnitas", code: "370851454", address: "Panevėžio g. 17, Panevėžys", phone: "+37069025478", email: "a@b.lt", iban: "LT47 8518 1849 7521 5400", director: "Vardas Pavardenis", director_title: "Direktorius" };
const terms = { workDescription: "Čiaupo keitimas", advancePercent: 30, advanceDate: "2026-11-25", paymentDays: 7, startDate: "2026-11-25", endDate: "2026-12-09", acceptanceDays: 5, warrantyMonths: 24, penaltyPercent: 0.02 };
const data = { seller, clientName: "Virgis", clientAddress: "Kauno g. 7", workAddress: "Kaunas", totalGross: 1000, vatRate: 21, estimateNumber: "2026-007", today: "2026-11-18", terms };

test("longDate", () => {
  assert.equal(longDate("2026-11-18"), "2026 m. lapkričio 18 d.");
  assert.equal(longDate("2026-02-01"), "2026 m. vasario 1 d.");
  assert.equal(longDate(""), "");
});

test("renderTemplate: pildo laukus, tušti ir nežinomi tampa [ŽYMEKLIAIS], numeris ir parašai paliekami", () => {
  const vars = buildTemplateVars(data);
  const t = "{{data_ilga}} Nr. {{numeris}}\n{{uzsakovas}} moka {{kaina}} ({{pvm_tekstas}}), avansas {{avansas_procentai}} % = {{avanso_suma}}.\n{{uzsakovo_telefonas}} {{nezinomas}}\n{{parasu_blokas}}";
  const r = renderTemplate(t, vars);
  assert.match(r, /^2026 m\. lapkričio 18 d\. Nr\. \{\{numeris\}\}/);
  assert.match(r, /Virgis moka 1\s?000,00\s€ \(įskaitant 21 % PVM\), avansas 30 % = 300,00\s€\./);
  assert.match(r, /\[UŽSAKOVO TELEFONAS\] \[NEZINOMAS\]/);
  assert.ok(r.endsWith("{{parasu_blokas}}"));
  assert.deepEqual(unknownFields(t), ["nezinomas"]);
});

test("buildTemplateVars: likusi suma, miestas, direktorius ir numatytos pareigos", () => {
  const v = buildTemplateVars({ ...data, seller: { ...seller, director_title: "" } });
  assert.equal(v.miestas, "Panevėžys");
  assert.equal(v.direktoriaus_pareigos, "Direktorius");
  assert.match(v.likusi_suma, /700,00/);
  assert.equal(v.apmokejimo_dienos, "7");
  for (const d of VARIABLES) assert.ok(d.key === "numeris" || d.key === "parasu_blokas" || d.key in v, `trūksta ${d.key}`);
  assert.ok(DEFAULT_TERMS.paymentDays === 7);
});

test("autoReplaceSeller: pakeičia įmonės duomenis, IBAN su skirtingais tarpais", () => {
  const text = "UAB Santechnitas, kodas 370851454, adresas Panevėžio g. 17, Panevėžys. A. s. LT478518184975215400. Direktorius Vardas Pavardenis. a@b.lt";
  const r = autoReplaceSeller(text, seller);
  assert.equal(r.text, "{{rangovas}}, kodas {{rangovo_kodas}}, adresas {{rangovo_adresas}}. A. s. {{rangovo_sask}}. Direktorius {{direktorius}}. {{rangovo_el_pastas}}");
  assert.ok(r.replaced.includes("rangovo_sask"));
});

test("autoReplaceSeller: trumpų reikšmių ir tuščių laukų nekeičia", () => {
  const r = autoReplaceSeller("Kodas 12, 12 d.", { legal_name: "ab", code: "12" });
  assert.equal(r.text, "Kodas 12, 12 d.");
  assert.deepEqual(r.replaced, []);
});

test("findCandidates: datos, sumos, procentai, dienos ir mėnesiai pagal pavyzdinę sutartį", () => {
  const text = "2022 m. vasario 1 d. Nr.\nIki 2023 m. vasario 1 dienos. Per 30 kalendorinių dienų sumokėti 100000,00 Eur ir PVM 21000, Eur. Bendra suma – 121000 Eur. Garantija 24 mėn. PVM 21 %. Terminas 2026-12-09 ir per 5 darbo dienas.";
  const c = findCandidates(text);
  const by = (k: string) => c.filter((x) => x.kind === k).map((x) => x.text);
  assert.deepEqual(by("date"), ["2022 m. vasario 1 d.", "2023 m. vasario 1 dienos", "2026-12-09"]);
  assert.deepEqual(by("money"), ["100000,00 Eur", "21000, Eur", "121000 Eur"]);
  assert.deepEqual(by("days"), ["30", "5"]);
  assert.deepEqual(by("months"), ["24"]);
  assert.deepEqual(by("percent"), ["21"]);
  // be persidengimo
  for (let i = 1; i < c.length; i++) assert.ok(c[i].start >= c[i - 1].end);
});

test("findCandidates + replaceRange: pakeičia tik pasirinktą vietą; jau pakeistų nebesiūlo", () => {
  const text = "Per 30 kalendorinių dienų, vėliau 30 dienų.";
  const first = findCandidates(text)[0];
  const next = replaceRange(text, first.start, first.end, "apmokejimo_dienos");
  assert.equal(next, "Per {{apmokejimo_dienos}} kalendorinių dienų, vėliau 30 dienų.");
  assert.equal(findCandidates(next).length, 1);
});

test("docxXmlToText: pastraipos, tarpai ir simboliai", () => {
  const xml = '<w:document><w:body><w:p><w:r><w:t>DARBŲ SUTARTIS</w:t></w:r></w:p><w:p><w:r><w:t>A &amp; B</w:t></w:r><w:tab/><w:r><w:t>2</w:t></w:r></w:p><w:p/><w:p><w:r><w:t>Pabaiga</w:t></w:r></w:p></w:body></w:document>';
  assert.equal(docxXmlToText(xml), "DARBŲ SUTARTIS\nA & B 2\nPabaiga");
});
