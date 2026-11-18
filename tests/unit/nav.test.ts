import { test } from "node:test";
import assert from "node:assert/strict";
import { isNavActive } from "../../src/lib/nav";

test("isNavActive: tiksli ir vidinė nuoroda", () => {
  assert.equal(isNavActive("/darbai", "/darbai"), true);
  assert.equal(isNavActive("/darbai/123", "/darbai"), true);
  assert.equal(isNavActive("/darbai2", "/darbai"), false);
  assert.equal(isNavActive("/kalendorius", "/darbai"), false);
});

test("isNavActive: sąmatos punktas aktyvus visuose dokumentų puslapiuose, bet ne kituose Valdymo skirtukuose", () => {
  const href = "/valdymas/dokumentai/naujas?kind=estimate";
  const match = "/valdymas/dokumentai";
  assert.equal(isNavActive("/valdymas/dokumentai", href, match), true);
  assert.equal(isNavActive("/valdymas/dokumentai/naujas", href, match), true);
  assert.equal(isNavActive("/valdymas/dokumentai/abc", href, match), true);
  assert.equal(isNavActive("/valdymas/objektai", href, match), false);
  assert.equal(isNavActive("/valdymas", href, match), false);
});

test("isNavActive: be match naudoja href be užklausos dalies", () => {
  assert.equal(isNavActive("/valdymas/dokumentai/naujas", "/valdymas/dokumentai/naujas?kind=estimate"), true);
});

test("isNavActive: Sąmata (/samata) aktyvi sąmatos ir katalogo puslapiuose", () => {
  assert.equal(isNavActive("/samata", "/samata"), true);
  assert.equal(isNavActive("/samata/katalogas", "/samata"), true);
  assert.equal(isNavActive("/samata/abc", "/samata"), true);
  assert.equal(isNavActive("/valdymas/dokumentai", "/samata"), false);
});
