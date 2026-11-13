import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, dayStartIso, formatDuration, fromLocalInput, isValidDayKey, monthKey, monthRange, shiftMonth, todayKey, toLocalInput, weekStart, weekdayIndex } from "../../src/lib/dates";

test("todayKey skaičiuoja pagal Lietuvos laiką, o ne UTC", () => {
  assert.equal(todayKey(new Date("2026-06-30T21:30:00Z")), "2026-07-01"); // vasara: UTC+3
  assert.equal(todayKey(new Date("2026-12-31T21:59:59Z")), "2026-12-31"); // žiema: UTC+2
  assert.equal(todayKey(new Date("2026-12-31T22:00:00Z")), "2027-01-01");
});

test("addDays pereina per mėnesius, metus ir keliamuosius metus", () => {
  assert.equal(addDays("2026-02-28", 1), "2026-03-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});

test("savaitė prasideda pirmadienį", () => {
  assert.equal(weekdayIndex("2026-11-12"), 3); // ketvirtadienis
  assert.equal(weekStart("2026-11-12"), "2026-11-09");
  assert.equal(weekStart("2026-11-09"), "2026-11-09");
  assert.equal(weekStart("2026-11-15"), "2026-11-09"); // sekmadienis
});

test("monthRange ir shiftMonth", () => {
  assert.deepEqual(monthRange("2026-02"), { from: "2026-02-01", to: "2026-02-28", year: 2026, month: 2 });
  assert.equal(monthRange("2028-02").to, "2028-02-29");
  assert.equal(monthRange("2026-12").to, "2026-12-31");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-03", 12), "2027-03");
  assert.equal(monthKey("2026-11-12"), "2026-11");
});

test("isValidDayKey atmeta neegzistuojančias datas", () => {
  for (const bad of ["2026-02-30", "2026-13-01", "abc", "2026-2-5", "", "2026-00-10"]) assert.equal(isValidDayKey(bad), false, bad);
  for (const good of ["2026-02-28", "2028-02-29"]) assert.equal(isValidDayKey(good), true, good);
  assert.equal(isValidDayKey("2026-02-29"), false); // 2026 nėra keliamieji
});

test("dayStartIso teisingas vasaros ir žiemos laiku bei laiko kaitos dienomis", () => {
  assert.equal(dayStartIso("2026-07-01"), "2026-06-30T21:00:00.000Z"); // UTC+3
  assert.equal(dayStartIso("2026-12-01"), "2026-11-30T22:00:00.000Z"); // UTC+2
  assert.equal(dayStartIso("2026-03-29"), "2026-03-28T22:00:00.000Z"); // pavasario kaitos diena prasideda žiemos laiku
  assert.equal(dayStartIso("2026-03-30"), "2026-03-29T21:00:00.000Z");
  assert.equal(dayStartIso("2026-10-25"), "2026-10-24T21:00:00.000Z"); // rudens kaitos diena prasideda vasaros laiku
  assert.equal(dayStartIso("2026-10-26"), "2026-10-25T22:00:00.000Z");
});

test("toLocalInput ir fromLocalInput", () => {
  assert.equal(toLocalInput("2026-07-01T06:30:00Z"), "2026-07-01T09:30");
  assert.equal(toLocalInput("2026-12-01T06:30:00Z"), "2026-12-01T08:30");
  assert.equal(fromLocalInput("2026-07-01T09:30"), "2026-07-01T06:30:00.000Z");
  assert.equal(fromLocalInput("2026-12-01T08:30"), "2026-12-01T06:30:00.000Z");
  for (const bad of ["2026-02-30T08:30", "2026-07-01T24:00", "2026-07-01T08:60", "bad", "2026-07-01 08:30", ""]) assert.equal(fromLocalInput(bad), null, bad);
});

test("fromLocalInput teisingas laiko kaitos dienomis (be 1 val. paklaidos)", () => {
  // Pavasaris 2026-03-29: 03:00 -> 04:00. 12:00 jau vasaros laiku (UTC+3).
  assert.equal(fromLocalInput("2026-03-29T12:00"), "2026-03-29T09:00:00.000Z");
  assert.equal(fromLocalInput("2026-03-29T02:30"), "2026-03-29T00:30:00.000Z"); // dar žiemos laikas (UTC+2)
  // Ruduo 2026-10-25: 04:00 -> 03:00. 12:00 jau žiemos laiku (UTC+2).
  assert.equal(fromLocalInput("2026-10-25T12:00"), "2026-10-25T10:00:00.000Z");
  assert.equal(fromLocalInput("2026-10-25T02:30"), "2026-10-24T23:30:00.000Z"); // dar vasaros laikas (UTC+3)
});

test("fromLocalInput ir toLocalInput sutampa kiekvienai valandai kaitos dienomis", () => {
  for (const day of ["2026-03-29", "2026-10-25", "2026-07-15", "2026-01-15"]) {
    for (let h = 0; h < 24; h++) {
      for (const min of [0, 30]) {
        const local = `${day}T${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
        const iso = fromLocalInput(local);
        assert.ok(iso, local);
        // 2026-03-29 03:xx neegzistuoja (laikrodis šokteli iš 03:00 į 04:00) – jai grįžtamumo nereikalaujame.
        if (day === "2026-03-29" && h === 3) continue;
        assert.equal(toLocalInput(iso), local, local);
      }
    }
  }
});

test("formatDuration", () => {
  assert.equal(formatDuration(0), "0 val. 0 min.");
  assert.equal(formatDuration(59), "0 val. 59 min.");
  assert.equal(formatDuration(125), "2 val. 5 min.");
});
