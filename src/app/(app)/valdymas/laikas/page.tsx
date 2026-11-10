import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import TimeAdmin from "@/components/admin/TimeAdmin";
import { requireContext } from "@/lib/auth/context";
import { getMembers, getProjects, getTimeEntries, memberLabel } from "@/lib/admin/queries";
import { monthKey, monthTitle, shiftMonth, todayKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function LaikasPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const today = todayKey();
  const currentYm = monthKey(today);
  const m = first(sp.m);
  const ym = /^\d{4}-(0[1-9]|1[0-2])$/.test(m) && m <= currentYm ? m : currentYm;

  const members = (await getMembers(ctx)).filter((x) => x.status === "active" && x.userId);
  const wanted = first(sp.d);
  const selected = members.find((x) => x.userId === wanted) ?? members.find((x) => x.userId === ctx.userId) ?? members[0];
  if (!selected) return <p className="text-muted">Darbuotojų nėra.</p>;

  const [entries, projects] = await Promise.all([getTimeEntries(ctx, selected.userId as string, ym), getProjects(ctx)]);
  const nav = "flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-white";
  const link = (month: string) => `/valdymas/laikas?d=${selected.userId}&m=${month}`;

  return (
    <div className="space-y-4">
      <form method="get" action="/valdymas/laikas" className="flex gap-2">
        <input type="hidden" name="m" value={ym} />
        <select name="d" defaultValue={selected.userId ?? ""} aria-label="Darbuotojas" className="min-h-12 min-w-0 flex-1 rounded-xl border border-black/15 bg-white px-3">
          {members.map((x) => <option key={x.id} value={x.userId ?? ""}>{memberLabel(x)}</option>)}
        </select>
        <button className="min-h-12 rounded-2xl border border-black/15 px-4 font-semibold">Rodyti</button>
      </form>
      <div className="flex items-center justify-between">
        <Link href={link(shiftMonth(ym, -1))} aria-label="Ankstesnis mėnuo" className={nav}><ChevronLeft aria-hidden /></Link>
        <h2 className="text-xl font-bold">{monthTitle(ym)}</h2>
        {ym === currentYm ? <span aria-hidden className={`${nav} opacity-40`}><ChevronRight /></span> : <Link href={link(shiftMonth(ym, 1))} aria-label="Kitas mėnuo" className={nav}><ChevronRight aria-hidden /></Link>}
      </div>
      <TimeAdmin key={`${selected.userId}-${ym}`} userId={selected.userId as string} entries={entries} defaultDay={ym === currentYm ? today : `${ym}-01`} projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
    </div>
  );
}
