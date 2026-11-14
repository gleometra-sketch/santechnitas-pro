import { test } from "node:test";
import assert from "node:assert/strict";
import { carAlerts, carStatuses, daysBetween, daysToKmReminder, oilLeftKm, validateKm, type CarRow } from "../../src/lib/cars/logic";

const car = (over: Partial<CarRow> = {}): CarRow => ({
  id: "c1", name: "VW Caddy", plate: "ABC 123", vin: null, driver_id: "u1", active: true, needs_km: false,
  km: 100_000, km_date: "2026-11-10", oil_last_km: 95_000, oil_interval_km: 10_000, oil_warn_km: 1_000, reminder_days: 14,
  inspection_until: null, road_tax_until: null, insurance_until: null, ...over,
});
const TODAY = "2026-11-14";

test("daysBetween skaičiuoja per mėnesių ribą", () => {
  assert.equal(daysBetween("2026-11-14", "2026-12-14"), 30);
  assert.equal(daysBetween("2026-11-14", "2026-11-10"), -4);
});

test("validateKm: rodmuo negali mažėti ir turi būti teigiamas", () => {
  assert.equal(validateKm(100_000, 100_000), null);
  assert.equal(validateKm(100_500, 100_000), null);
  assert.match(validateKm(99_999, 100_000) ?? "", /negali būti mažesnis/);
  assert.ok(validateKm(0, 0));
  assert.ok(validateKm(Number.NaN, 0));
});

test("tepalai: likutis ir įspėjimai", () => {
  assert.equal(oilLeftKm(car()), 5_000);
  assert.equal(carAlerts(car(), TODAY).some((a) => a.kind === "oil"), false);
  const warn = carAlerts(car({ km: 104_500 }), TODAY).find((a) => a.kind === "oil");
  assert.equal(warn?.level, "warn");
  const over = carAlerts(car({ km: 106_000 }), TODAY).find((a) => a.kind === "oil");
  assert.equal(over?.level, "expired");
});

test("terminai: pasibaigęs, artėjantis ir tolimas", () => {
  const a = carAlerts(car({ inspection_until: "2026-11-01", road_tax_until: "2026-11-20", insurance_until: "2027-06-01" }), TODAY);
  assert.equal(a.find((x) => x.kind === "inspection")?.level, "expired");
  assert.equal(a.find((x) => x.kind === "road_tax")?.level, "warn");
  assert.equal(a.find((x) => x.kind === "insurance"), undefined);
  assert.equal(a[0].kind, "inspection"); // pasibaigę rodomi pirmi
});

test("kilometražo priminimas", () => {
  assert.equal(daysToKmReminder(car(), TODAY), 10); // 14 - 4
  assert.equal(daysToKmReminder(car({ km_date: "2026-10-01" }), TODAY), -30); // vėluoja 30 d.
  assert.equal(daysToKmReminder(car({ needs_km: true }), TODAY), 0);
  assert.equal(daysToKmReminder(car({ active: false }), TODAY), null);
});

test("neaktyvus automobilis: terminai lieka, km ir tepalų priminimų nėra", () => {
  const a = carAlerts(car({ active: false, km: 106_000, km_date: "2026-01-01", insurance_until: "2026-11-15" }), TODAY);
  assert.deepEqual(a.map((x) => x.kind), ["insurance"]);
});

test("būsenų blokai: penki, su data, sakiniu ir spalva", () => {
  const st = carStatuses(car({ inspection_until: "2026-11-01", road_tax_until: "2026-12-01", insurance_until: "2027-06-01", km: 104_500 }), TODAY);
  assert.deepEqual(st.map((x) => x.kind), ["inspection", "road_tax", "insurance", "oil", "km"]);
  const by = Object.fromEntries(st.map((x) => [x.kind, x]));
  assert.deepEqual([by.inspection.value, by.inspection.detail, by.inspection.level], ["2026-11-01", "Pasibaigė prieš 13 d.", "expired"]);
  assert.deepEqual([by.road_tax.detail, by.road_tax.level], ["Liko 17 d.", "warn"]);
  assert.deepEqual([by.insurance.detail, by.insurance.level], ["Liko 199 d.", "ok"]);
  assert.equal(by.oil.level, "warn"); // liko 500 km ≤ 1000
  assert.match(by.oil.value, /500/);
  assert.equal(by.km.value.replace(/\s/g, " "), "104 500 km".replace(/\s/g, " "));
});

test("būsenų blokai: nenurodyta data, pavėluoti tepalai, neaktyvus", () => {
  const none = carStatuses(car(), TODAY)[0];
  assert.deepEqual([none.value, none.level], ["Nenurodyta", "none"]);
  const late = carStatuses(car({ km: 106_000 }), TODAY).find((x) => x.kind === "oil");
  assert.deepEqual([late?.level, late?.detail.includes("Pavėluota")], ["expired", true]);
  const off = carStatuses(car({ active: false, insurance_until: "2026-11-15" }), TODAY);
  assert.equal(off.find((x) => x.kind === "oil")?.level, "none");
  assert.equal(off.find((x) => x.kind === "km")?.level, "none");
  assert.deepEqual([off.find((x) => x.kind === "insurance")?.detail, off.find((x) => x.kind === "insurance")?.level], ["Liko 1 d.", "warn"]); // terminai lieka
  assert.equal(carStatuses(car({ insurance_until: TODAY }), TODAY)[2].detail, "Baigiasi šiandien");
});
