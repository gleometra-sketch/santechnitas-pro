import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getContext } from "@/lib/auth/context";
import { formatTime, monthKey, monthRange, todayKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

const fmt = (min: number) => `${Math.floor(min / 60)}:${String(Math.round(min % 60)).padStart(2, "0")}`;
const csvCell = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

// Mėnesio darbo laiko ataskaita (CSV, atidaroma Excel). Rodo tik prisijungusio naudotojo įrašus.
export async function GET(request: NextRequest) {
  const ctx = await getContext();
  if (!ctx?.company) return new NextResponse("Neprisijungta", { status: 401 });

  const m = request.nextUrl.searchParams.get("m") ?? "";
  const ym = /^\d{4}-(0[1-9]|1[0-2])$/.test(m) && m <= monthKey(todayKey()) ? m : monthKey(todayKey());
  const { from, to } = monthRange(ym);

  const supabase = await createClient();
  const { data } = await supabase
    .from("time_entry_summary")
    .select("started_at, ended_at, work_date, worked_minutes")
    .eq("user_id", ctx.userId)
    .gte("work_date", from)
    .lte("work_date", to)
    .order("started_at", { ascending: true });

  let total = 0;
  const lines = ["Data;Pradžia;Pabaiga;Dirbta (val:min)"];
  for (const r of data ?? []) {
    total += Number(r.worked_minutes);
    lines.push([r.work_date, formatTime(r.started_at), r.ended_at ? formatTime(r.ended_at) : "vyksta", fmt(Number(r.worked_minutes))].map(csvCell).join(";"));
  }
  lines.push(["Iš viso", "", "", fmt(total)].join(";"));

  return new NextResponse("\uFEFF" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="darbo-laikas-${ym}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
