import { test } from "node:test";
import assert from "node:assert/strict";
import { composeNote } from "../../src/lib/work/noteText";

test("composeNote: medžiaga su kiekiu ir vienetu", () => {
  assert.deepEqual(composeNote([{ name: " plienas ", qty: "10", unit: "vnt." }], ""), { body: "plienas 10 vnt." });
});

test("composeNote: keli įrašai ir papildomas tekstas atskiriami eilutėmis", () => {
  const r = composeNote(
    [{ name: "vamzdis", qty: "2,5", unit: "m" }, { name: "", qty: "1", unit: "vnt." }, { name: "movos", qty: "4.5", unit: "vnt." }],
    "  klientas prašo skambinti ",
  );
  assert.deepEqual(r, { body: "vamzdis 2,5 m\nmovos 4,5 vnt.\nklientas prašo skambinti" });
});

test("composeNote: be kiekio lieka tik pavadinimas", () => {
  assert.deepEqual(composeNote([{ name: "silikonas", qty: "", unit: "vnt." }], ""), { body: "silikonas" });
});

test("composeNote: klaidos", () => {
  assert.ok("error" in composeNote([{ name: "x", qty: "0", unit: "vnt." }], ""));
  assert.ok("error" in composeNote([{ name: "x", qty: "abc", unit: "vnt." }], ""));
  assert.ok("error" in composeNote([{ name: "", qty: "1", unit: "vnt." }], "   "));
  assert.ok("error" in composeNote([], "a".repeat(4001)));
});
