import { getContext, isAdmin } from "@/lib/auth/context";
import { getMonthReport } from "@/lib/admin/queries";
import { buildReportCsv } from "@/lib/admin/csv";
import { monthKey, todayKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** Mėnesio valandų ataskaita CSV formatu. Tik administratoriams. */
export async function GET(request: Request) {
  const ctx = await getContext();
  if (!ctx?.company || !isAdmin(ctx.role)) return new Response("Draudžiama", { status: 403 });

  const currentYm = monthKey(todayKey());
  const m = new URL(request.url).searchParams.get("m") ?? "";
  const ym = /^\d{4}-(0[1-9]|1[0-2])$/.test(m) && m <= currentYm ? m : currentYm;

  const csv = buildReportCsv(await getMonthReport(ctx, ym));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="darbo-valandos-${ym}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
