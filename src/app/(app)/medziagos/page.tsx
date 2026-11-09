import Link from "next/link";
import { redirect } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import MaterialsList from "@/components/MaterialsList";
import { isAdmin, requireContext } from "@/lib/auth/context";
import { isValidDayKey } from "@/lib/dates";
import { getAdminMaterials, getMaterialOptions, getMaterialSummary } from "@/lib/work/materials";
import type { MaterialFilters, MaterialStatusFilter } from "@/lib/work/types";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseFilters(sp: SP): MaterialFilters {
  const b = first(sp.b);
  const d = first(sp.d);
  const o = first(sp.o);
  const nuo = first(sp.nuo);
  const iki = first(sp.iki);
  return {
    status: (["needed", "purchased", "all"].includes(b) ? b : "needed") as MaterialStatusFilter,
    employeeId: UUID.test(d) ? d : null,
    projectId: UUID.test(o) ? o : null,
    material: first(sp.m).trim().slice(0, 100),
    from: isValidDayKey(nuo) ? nuo : null,
    to: isValidDayKey(iki) ? iki : null,
  };
}

const TABS: { status: MaterialStatusFilter; label: string }[] = [
  { status: "needed", label: "Trūkstamos" },
  { status: "purchased", label: "Nupirktos" },
  { status: "all", label: "Visa istorija" },
];

export default async function MedziagosPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireContext();
  if (!ctx.company) redirect("/kurti-imone");
  if (!isAdmin(ctx.role)) redirect("/darbai");

  const f = parseFilters(await searchParams);
  const [summary, options, { items, truncated }] = await Promise.all([
    getMaterialSummary(ctx),
    getMaterialOptions(ctx),
    getAdminMaterials(ctx, f),
  ]);

  const extra = new URLSearchParams();
  if (f.employeeId) extra.set("d", f.employeeId);
  if (f.projectId) extra.set("o", f.projectId);
  if (f.material) extra.set("m", f.material);
  if (f.from) extra.set("nuo", f.from);
  if (f.to) extra.set("iki", f.to);
  const tabHref = (s: MaterialStatusFilter) => {
    const p = new URLSearchParams(extra);
    p.set("b", s);
    return `/medziagos?${p.toString()}`;
  };
  const filtered = Array.from(extra.keys()).length > 0;

  const cards = [
    { label: "Trūkstamos medžiagos", value: summary.missingItems, tone: "text-accent-dark" },
    { label: "Aktyvūs prašymai", value: summary.openRequests, tone: "" },
    { label: "Šiandien pateikta", value: summary.requestsToday, tone: "" },
    { label: "Nupirkta medžiagų", value: summary.purchasedItems, tone: "text-go-dark" },
  ];
  const field = "mt-1 min-h-12 w-full rounded-xl border border-black/15 bg-white px-3";

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Medžiagos</h1>

      <section aria-label="Suvestinė" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-white p-4 shadow-card">
            <p className={`text-3xl font-extrabold ${c.tone}`}>{c.value}</p>
            <p className="mt-1 text-sm text-muted">{c.label}</p>
          </div>
        ))}
      </section>

      <nav aria-label="Medžiagų rodinys" className="grid grid-cols-3 gap-1 rounded-2xl bg-white p-1 shadow-card">
        {TABS.map((t) => (
          <Link
            key={t.status}
            href={tabHref(t.status)}
            aria-current={f.status === t.status ? "page" : undefined}
            className={`flex min-h-12 items-center justify-center rounded-xl px-2 text-center text-sm font-semibold ${
              f.status === t.status ? "bg-navy text-white" : "text-muted"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <details open={filtered} className="rounded-card bg-white p-5 shadow-card">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-bold">
          <SlidersHorizontal size={20} aria-hidden /> Filtrai{filtered && <span className="rounded-full bg-accent-soft px-2 text-sm text-accent-dark">įjungti</span>}
        </summary>
        <form method="get" action="/medziagos" className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-muted">Darbuotojas</span>
            <select name="d" defaultValue={f.employeeId ?? ""} className={field}>
              <option value="">Visi</option>
              {options.employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-muted">Objektas</span>
            <select name="o" defaultValue={f.projectId ?? ""} className={field}>
              <option value="">Visi</option>
              {options.projects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.address ? ` – ${p.address}` : ""}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-muted">Medžiaga</span>
            <input name="m" defaultValue={f.material} maxLength={100} placeholder="Pavadinimo dalis" className={field} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-muted">Pirkimo būsena</span>
            <select name="b" defaultValue={f.status} className={field}>
              <option value="needed">Trūkstamos</option>
              <option value="purchased">Nupirktos</option>
              <option value="all">Visos</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-muted">Pateikta nuo</span>
            <input type="date" name="nuo" defaultValue={f.from ?? ""} className={field} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-muted">Pateikta iki</span>
            <input type="date" name="iki" defaultValue={f.to ?? ""} className={field} />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button className="min-h-12 flex-1 rounded-2xl bg-accent font-semibold text-white">Filtruoti</button>
            <Link href={`/medziagos?b=${f.status}`} className="flex min-h-12 items-center justify-center rounded-2xl border border-black/10 px-5 font-semibold">Išvalyti</Link>
          </div>
        </form>
      </details>

      <MaterialsList items={items} view={f.status} truncated={truncated} />
    </div>
  );
}
