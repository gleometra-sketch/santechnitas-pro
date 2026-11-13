import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "../../src/lib/auth/validation";

test("safeNext leidžia tik vidinius adresus", () => {
  assert.equal(safeNext("/darbai"), "/darbai");
  assert.equal(safeNext("/valdymas/ataskaita?m=2026-10"), "/valdymas/ataskaita?m=2026-10");
});

test("safeNext blokuoja nukreipimą į svetimą svetainę", () => {
  for (const bad of ["https://svetima.lt", "//svetima.lt", "/\\svetima.lt", "darbai", "", "/\t/svetima.lt", "/\n/svetima.lt", "/\r/svetima.lt", "/\u0000/x", null, undefined, 42, {}]) {
    assert.equal(safeNext(bad as unknown), null, JSON.stringify(bad));
  }
});
