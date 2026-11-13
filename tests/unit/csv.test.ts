import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReportCsv } from "../../src/lib/admin/csv";
import { summarize } from "../../src/lib/admin/reportCalc";
import type { ReportRow } from "../../src/lib/admin/types";

const row = (over: Partial<ReportRow>): ReportRow => ({
  userId: "u1", name: "Antanas", minutes: 90, amountCents: 1875, missingRateMinutes: 0, rateCents: 1250, openCount: 0, approvedAt: null,
  byProject: [{ projectId: "p1", name: "Vilnius, Gedimino 1", minutes: 90, amountCents: 1875 }], ...over,
});

test("CSV: BOM, kabliataškiai, kablelis kaip dešimtainis skyriklis, CRLF", () => {
  const csv = buildReportCsv(summarize("2026-03", [row({})]));
  assert.equal(csv.charCodeAt(0), 0xfeff);
  const lines = csv.slice(1).split("\r\n");
  assert.equal(lines[0], "Mėnuo;Darbuotojas;Objektas;Valandos;Įkainis €/val.;Suma €;Būsena;Pastaba");
  assert.equal(lines[1], "2026-03;Antanas;Vilnius, Gedimino 1;1,50;12,50;18,75;Nepatvirtinta;");
  assert.equal(lines[2], "");
});

test("CSV: patvirtinta būsena ir pastaba apie trūkstamą įkainį", () => {
  const csv = buildReportCsv(summarize("2026-03", [row({ approvedAt: "2026-04-02T08:00:00Z" }), row({ userId: "u2", name: "Zita", rateCents: null, amountCents: 0, missingRateMinutes: 90, byProject: [{ projectId: "p1", name: "Vilnius, Gedimino 1", minutes: 90, amountCents: 0 }] })]));
  assert.match(csv, /Antanas;.*;Patvirtinta;\r\n/);
  assert.match(csv, /Zita;Vilnius, Gedimino 1;1,50;;0,00;Nepatvirtinta;Dalies laiko įkainis nenustatytas/);
});

test("CSV: laukai su kabliataškiu, kabutėmis ir eilutės lūžiu cituojami", () => {
  const csv = buildReportCsv(summarize("2026-03", [row({ name: 'Jonas; "Mažasis"', byProject: [{ projectId: "p", name: "Pirma\nantra", minutes: 60, amountCents: 100 }] })]));
  assert.ok(csv.includes('"Jonas; ""Mažasis"""'));
  assert.ok(csv.includes('"Pirma\nantra"'));
});

test("CSV: apsauga nuo formulių injekcijos Excel", () => {
  for (const evil of ["=HYPERLINK(\"http://x\")", "+cmd|' /C calc'!A0", "-2+3", "@SUM(1+1)"]) {
    const csv = buildReportCsv(summarize("2026-03", [row({ name: evil })]));
    const line = csv.slice(1).split("\r\n")[1];
    const cell = line.split(";")[1];
    assert.ok(cell.startsWith("'") || cell.startsWith('"\''), `${evil} -> ${cell}`);
  }
});
