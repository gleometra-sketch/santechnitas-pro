// Apatinio meniu aktyvaus punkto nustatymas (be React, kad būtų galima testuoti).

/** Punktas aktyvus, kai kelias prasideda jo `match` (jei yra) arba `href`; palyginama ties kelio riba, todėl „/darbai“ neapima „/darbai2“. */
export function isNavActive(pathname: string, href: string, match?: string): boolean {
  const base = match ?? href.split("?")[0];
  return pathname === base || pathname.startsWith(base + "/");
}
