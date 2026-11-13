import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRows, overlayApprovals, rateAt, summarize, type ApprovalRow, type EntryRow, type RateRow } from "../../src/lib/admin/reportCalc";

const names = new Map([["u1", "Antanas"], ["u2", "Zita"], ["u3", "Jonas"]]);
const projects = new Map([["p1", "Vilnius, Gedimino 1"], ["p2", "Kaunas, Laisvės 5"]]);
const e = (userId: string, workDate: string, minutes: number, projectId: string | null = null, ended = true): EntryRow => ({ userId, projectId, workDate, minutes, ended });

test("rateAt ima tos dienos įkainį iš istorijos (ir neatsižvelgia į įrašų tvarką)", () => {
  const rates: RateRow[] = [
    { userId: "u1", from: "2026-03-01", cents: 1200 },
    { userId: "u1", from: "2026-01-01", cents: 1000 },
    { userId: "u2", from: "2026-01-01", cents: 2000 },
  ];
  assert.equal(rateAt(rates, "u1", "2025-12-31"), null);
  assert.equal(rateAt(rates, "u1", "2026-01-01"), 1000);
  assert.equal(rateAt(rates, "u1", "2026-02-28"), 1000);
  assert.equal(rateAt(rates, "u1", "2026-03-01"), 1200);
  assert.equal(rateAt(rates, "u1", "2027-01-01"), 1200);
  assert.equal(rateAt(rates, "u3", "2026-03-01"), null);
});

test("suma = valandos × įkainis, o pasikeitęs įkainys taikomas tik nuo nurodytos dienos", () => {
  const rates: RateRow[] = [{ userId: "u1", from: "2026-01-01", cents: 1000 }, { userId: "u1", from: "2026-03-15", cents: 1200 }];
  const rows = buildRows([e("u1", "2026-03-10", 120), e("u1", "2026-03-20", 120)], rates, names, projects, "2026-03-31");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].minutes, 240);
  assert.equal(rows[0].amountCents, 2000 + 2400); // 2 val. × 10 € + 2 val. × 12 €
  assert.equal(rows[0].rateCents, 1200); // mėnesio pabaigos įkainis
  assert.equal(rows[0].missingRateMinutes, 0);
});

test("be įkainio laikas skaičiuojamas, bet į sumą neįtraukiamas ir pažymimas", () => {
  const rows = buildRows([e("u2", "2026-03-10", 90)], [], names, projects, "2026-03-31");
  assert.equal(rows[0].minutes, 90);
  assert.equal(rows[0].amountCents, 0);
  assert.equal(rows[0].missingRateMinutes, 90);
  assert.equal(rows[0].rateCents, null);
});

test("įkainis, pradėjęs galioti mėnesio viduryje, ankstesnių dienų neapima", () => {
  const rates: RateRow[] = [{ userId: "u1", from: "2026-03-15", cents: 1000 }];
  const rows = buildRows([e("u1", "2026-03-10", 60), e("u1", "2026-03-16", 60)], rates, names, projects, "2026-03-31");
  assert.equal(rows[0].amountCents, 1000);
  assert.equal(rows[0].missingRateMinutes, 60);
});

test("skaidymas pagal objektą: didžiausias pirmas, „Be objekto“ ir nežinomas objektas", () => {
  const rates: RateRow[] = [{ userId: "u1", from: "2026-01-01", cents: 1200 }];
  const rows = buildRows(
    [e("u1", "2026-03-02", 60, "p1"), e("u1", "2026-03-03", 180, "p2"), e("u1", "2026-03-04", 30), e("u1", "2026-03-05", 30, "p-nezinomas"), e("u1", "2026-03-06", 60, "p1")],
    rates, names, projects, "2026-03-31",
  );
  const lines = rows[0].byProject;
  assert.deepEqual(lines.map((l) => [l.name, l.minutes]), [["Kaunas, Laisvės 5", 180], ["Vilnius, Gedimino 1", 120], ["Be objekto", 30], ["Objektas", 30]]);
  assert.equal(lines[0].amountCents, 3600);
  assert.equal(lines[1].amountCents, 2400);
  assert.equal(lines.find((l) => l.projectId === null)?.name, "Be objekto");
});

test("neuždaryti įrašai skaičiuojami, o darbuotojai rikiuojami pagal vardą", () => {
  const rows = buildRows([e("u2", "2026-03-02", 10, null, false), e("u1", "2026-03-02", 10), e("u1", "2026-03-03", 10, null, false)], [], names, projects, "2026-03-31");
  assert.deepEqual(rows.map((r) => r.name), ["Antanas", "Zita"]);
  assert.deepEqual(rows.map((r) => r.openCount), [1, 1]);
});

test("apvalinimas iki centų", () => {
  const rates: RateRow[] = [{ userId: "u1", from: "2026-01-01", cents: 1250 }];
  const rows = buildRows([e("u1", "2026-03-02", 1)], rates, names, projects, "2026-03-31");
  assert.equal(rows[0].amountCents, 21); // 1 min. × 12,50 €/val. = 0,2083 €
  const big = buildRows([e("u1", "2026-03-02", 7 * 60 + 30)], rates, names, projects, "2026-03-31");
  assert.equal(big[0].amountCents, 9375);
});

test("buvęs darbuotojas be vardo", () => {
  assert.equal(buildRows([e("nera", "2026-03-02", 5)], [], names, projects, "2026-03-31")[0].name, "Buvęs darbuotojas");
});

test("summarize sudeda sumas ir objektus per visus darbuotojus", () => {
  const rates: RateRow[] = [{ userId: "u1", from: "2026-01-01", cents: 1000 }, { userId: "u2", from: "2026-01-01", cents: 2000 }];
  const rows = buildRows([e("u1", "2026-03-02", 60, "p1"), e("u2", "2026-03-02", 120, "p1"), e("u2", "2026-03-03", 60, "p2"), e("u1", "2026-03-03", 30, null, false)], rates, names, projects, "2026-03-31");
  const r = summarize("2026-03", rows);
  assert.equal(r.totalMinutes, 270);
  assert.equal(r.totalAmountCents, 1000 + 4000 + 2000 + 500);
  assert.equal(r.openCount, 1);
  assert.equal(r.approvedCount, 0);
  assert.deepEqual(r.byProject.map((p) => [p.name, p.minutes, p.amountCents]), [["Vilnius, Gedimino 1", 180, 5000], ["Kaunas, Laisvės 5", 60, 2000], ["Be objekto", 30, 500]]);
});

test("patvirtintiems rodomi užšaldyti skaičiai, net jei įkainis vėliau pasikeitė", () => {
  const rows = buildRows([e("u1", "2026-03-02", 60, "p1"), e("u2", "2026-03-02", 60, "p1")], [{ userId: "u1", from: "2026-01-01", cents: 5000 }, { userId: "u2", from: "2026-01-01", cents: 1000 }], names, projects, "2026-03-31");
  const approvals: ApprovalRow[] = [{
    userId: "u1", minutes: 60, approvedAt: "2026-04-02T08:00:00Z",
    snapshot: { name: "Antanas", minutes: 60, amountCents: 1500, missingRateMinutes: 0, rateCents: 1500, byProject: [{ projectId: "p1", name: "Vilnius, Gedimino 1", minutes: 60, amountCents: 1500 }] },
  }];
  const out = overlayApprovals(rows, approvals, names);
  const u1 = out.find((r) => r.userId === "u1")!;
  assert.equal(u1.amountCents, 1500); // ne 5000
  assert.equal(u1.rateCents, 1500);
  assert.equal(u1.approvedAt, "2026-04-02T08:00:00Z");
  assert.equal(u1.openCount, 0);
  const u2 = out.find((r) => r.userId === "u2")!;
  assert.equal(u2.amountCents, 1000);
  assert.equal(u2.approvedAt, null);
  const s = summarize("2026-03", out);
  assert.equal(s.approvedCount, 1);
  assert.equal(s.totalAmountCents, 2500);
});

test("patvirtintas mėnuo be gyvų įrašų vis tiek rodomas iš snapshot", () => {
  const out = overlayApprovals([], [{ userId: "u3", minutes: 480, approvedAt: "2026-04-02T08:00:00Z", snapshot: { amountCents: 9600, rateCents: 1200, byProject: [] } }], names);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, "Jonas");
  assert.equal(out[0].minutes, 480);
  assert.equal(out[0].amountCents, 9600);
  assert.equal(overlayApprovals(out, [], names), out); // be patvirtinimų grąžinama ta pati lentelė
});
