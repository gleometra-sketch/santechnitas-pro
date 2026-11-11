import type { MonthReport } from "./types";

/** Apsauga nuo formulių injekcijos Excel (reikšmės, prasidedančios = + - @). */
function cell(v: string | number): string {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const hours = (minutes: number) => (minutes / 60).toFixed(2).replace(".", ",");
const money = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

/** CSV su kabliataškiais ir kableliu kaip dešimtainiu skyrikliu (atsidaro lietuviškame Excel). */
export function buildReportCsv(report: MonthReport): string {
  const lines = [["Mėnuo", "Darbuotojas", "Objektas", "Valandos", "Įkainis €/val.", "Suma €", "Būsena", "Pastaba"].map(cell).join(";")];
  for (const r of report.rows) {
    for (const p of r.byProject) {
      const note = r.missingRateMinutes > 0 ? "Dalies laiko įkainis nenustatytas (į sumą neįtraukta)" : "";
      lines.push([report.ym, r.name, p.name, hours(p.minutes), r.rateCents === null ? "" : money(r.rateCents), money(p.amountCents), r.approvedAt ? "Patvirtinta" : "Nepatvirtinta", note].map(cell).join(";"));
    }
  }
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}
